#!/usr/bin/env python3
"""Build the demo page assets from the clip folders in SRC.

    python3 build.py            # build everything (takes ~10 s per 10 clips)
    python3 build.py --auto     # (re)generate config.json from every clip folder found in SRC

config.json is the one file you edit:
  * "models": which models exist (id -> label, note, colour) -- these become the switcher buttons
  * "synthetic" / "hist_music" / "hist_vocal": the clips on the page. Each clip lists which audio
    file each model plays, in button order:
        {"folder": "hist_ood_tango_0001", "start": 5,
         "audio": {"input": "0_degraded.wav", "unet": "1_stage1_moliner_norm.wav", ...}}
    ("start" is optional: seconds to trim from the beginning of every model's audio.)

For every clip, build.py level-matches the files (see TARGET_LUFS), transcodes them to AAC (.m4a),
renders a spectrogram (.jpg) into assets/<folder>/ and writes manifest.js, which the page renders.
Only needs ffmpeg + ffprobe on PATH. No Python packages.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = Path("/Users/melissa/Desktop/Restoration/eval_samples/icassp_demo")
ASSETS = HERE / "assets"
CONFIG = HERE / "config.json"
MANIFEST = HERE / "manifest.js"

# The *_norm.wav files are NOT loudness-matched across models (HT-Demucs output is often 10+ LU
# quieter). Since listeners switch models mid-playback, all models of a sample are gain-adjusted to
# one shared integrated loudness: TARGET_LUFS, or lower if that would push any model's sample peak
# above PEAK_CEIL_DB (so models within a sample always match exactly, without clipping).
TARGET_LUFS = -23.0
PEAK_CEIL_DB = -1.0

# --------------------------------------------------------------------------------------
# Starting point for `--auto` ONLY. --auto writes these model definitions into config.json and, for
# each clip folder, maps every model to the first of its `files` that exists there. After that,
# config.json is the source of truth: edit models and per-clip audio there, not here.
# `default=False` models are defined in config.json but not mapped to any clip by --auto.
# Optional model fields (all end up in config.json):
#   group / subgroup  put the button in a labelled second row / a labelled cluster within a row
#   level="solo"      loudness-match this file on its own instead of together with the other models of
#                     the clip. Needed for stems: they are 15-35 dB quieter than a mix, so matching them
#                     to the mix would either barely lift them or drag the whole clip down.
#   groups=[...]      (--auto only) page groups whose clips get this model
# --------------------------------------------------------------------------------------
DEFAULT_MODELS = {
    "input": dict(
        label="Input",
        note="The degraded recording, before any processing.",
        color="#8a8378",
        files=["0_degraded_norm.wav", "0_degraded.wav", "0_input_norm.wav", "0_input.wav"],
    ),
    "clean": dict(
        label="Clean reference",
        note="Ground-truth clean mixture (synthetic set only).",
        color="#5b7f6a",
        files=["0_clean_norm.wav", "0_clean.wav"],
    ),
    "unet": dict(
        label="U-Net",
        note="Two-stage U-Net denoiser (Moliner &amp; V&auml;lim&auml;ki, 2022). Suppresses hiss and clicks; does not extend bandwidth.",
        color="#3f6fa6",
        files=["1_stage1_moliner_norm.wav"],
    ),
    "htdemucs": dict(
        label="HT-Demucs",
        note="Pretrained HT-Demucs (Rouard et al., 2023), the backbone RESTORE is built on, used as an off-the-shelf baseline.",
        color="#2f8f8a",
        files=["2_htdemucs_vm_norm.wav", "2_htdemucs_music_norm.wav", "2_htdemucs_vm.wav"],
    ),
    "izotope": dict(
        label="iZotope RX",
        note="iZotope RX 12 Advanced with the archival chain: de-click, de-crackle, de-hum, spectral de-noise, spectral recovery.",
        color="#c98a1e",
        files=["6_izotope_norm.wav"],
    ),
    "babe2": dict(
        label="BABE-2",
        note="Cascaded baseline: U-Net denoiser followed by the BABE-2 diffusion bandwidth-extension model (Moliner et al., 2024).",
        color="#7a5aa6",
        files=["1_stage3_babe2_music_norm.wav"],
    ),
    "ours": dict(
        label="RESTORE (ext. on)",
        note="Ours. One forward pass splits the recording into stems; the restored mix is the content stems plus the generative high-frequency extension stem.",
        color="#b4382a",
        ours=True,
        files=["5_mix_vme_crossv2_norm.wav", "5_mix_vme_cross_norm.wav"],
    ),
    # Guess from the filename: vocals+music mix, low-passed, i.e. the extension stem left out.
    "ours_lp": dict(
        label="RESTORE (ext. off)",
        note="Ours with the extension stem left out: the same separation and denoising, but no generated high frequencies, so the output stays band-limited.",
        color="#d0705f",
        ours=True,
        files=["3_v4ug_mix_vm_lp_norm.wav"],
    ),
    "vocals": dict(
        label='Vocals',
        group="RESTORE stems",
        subgroup='Content',
        color="#3d8b4b",
        level="solo",
        groups=["synthetic", "hist_vocal"],  # --auto only maps it to clips in these page groups
        note="RESTORE's vocal stem on its own: the recovered voice at the recording's surviving bandwidth (before extension). Normalised separately so it is easy to hear.",
        files=["3_v4ug_vocals_lp_norm.wav"],
    ),
    "music": dict(
        label='Music',
        group="RESTORE stems",
        subgroup='Content',
        color="#6f9a2f",
        level="solo",
        groups=["synthetic", "hist_vocal", "hist_music"],  # --auto only maps it to clips in these page groups
        note="RESTORE's music stem on its own: the accompaniment at the recording's surviving bandwidth (before extension). Normalised separately so it is easy to hear.",
        files=["3_v4ug_music_lp_norm.wav"],
    ),
    "broadband": dict(
        label='Broadband hiss',
        group="RESTORE stems",
        subgroup='Degradations',
        color="#7a766f",
        level="solo",
        groups=["synthetic", "hist_vocal", "hist_music"],  # --auto only maps it to clips in these page groups
        note='The broadband hiss RESTORE separated out and removes. Boosted so it is audible: in the mix it is far quieter.',
        files=["3_v4ug_broadband.wav"],
    ),
    "transient": dict(
        label='Transient clicks',
        group="RESTORE stems",
        subgroup='Degradations',
        color="#6b675f",
        level="solo",
        groups=["synthetic", "hist_vocal", "hist_music"],  # --auto only maps it to clips in these page groups
        note='The clicks and thumps RESTORE separated out and removes. Boosted so they are audible: in the mix they are far quieter.',
        files=["3_v4ug_transient.wav"],
    ),
    "residual": dict(
        label='Residual',
        group="RESTORE stems",
        subgroup='Degradations',
        color="#948f87",
        level="solo",
        groups=["synthetic", "hist_vocal", "hist_music"],  # --auto only maps it to clips in these page groups
        note="The catch-all stem for anything the other stems don't explain. It should stay close to silence. Boosted so it is audible.",
        files=["3_v4ug_residual.wav"],
    ),
    "extension": dict(
        label='HF extension',
        group="RESTORE stems",
        subgroup='Generative',
        color="#b8892a",
        level="solo",
        groups=["synthetic", "hist_vocal", "hist_music"],  # --auto only maps it to clips in these page groups
        note='The only synthesized content: the generated high-frequency extension, kept on its own stem so it stays auditable. Adding it to the content stems gives the full-band restoration.',
        files=["3_v4ug_extension.wav"],
    ),
}

# --------------------------------------------------------------------------------------
# Page structure. Each group draws its clips from `config.json[<group id>]`.
# --------------------------------------------------------------------------------------
SECTIONS = [  # page order
    dict(
        id="historical",
        title="Historical dataset",
        intro=(
            "Real 78&nbsp;RPM discs with no clean reference, trimmed to 60&nbsp;s. "
            "We separate two scenarios: recordings where a voice sings over the accompaniment, and instrumental recordings."
        ),
        groups=[
            dict(
                id="hist_vocal",
                title="Vocals + music",
                intro="Songs with a voice over light accompaniment. Each system outputs the full restored recording.",
            ),
            dict(
                id="hist_music",
                title="Music only",
                intro="Instrumental recordings. Each system outputs the music.",
            ),
        ],
    ),
    dict(
        id="synthetic",
        title="Synthetic dataset",
        intro=(
            "Clean vocal and instrumental stems are mixed and then degraded with a simulated historical "
            "recording chain (cutting-chain EQ, heavy band-limiting, gramophone noise, clicks and thumps). "
            "Because the degradation is synthetic, a clean reference exists for objective evaluation."
        ),
        groups=[dict(id="synthetic", title=None, intro=None)],
    ),
]

# Historical categories that are instrumental ("music only"); every other hist_* folder is vocals + music.
MUSIC_CATEGORIES = ["piano", "ood_jazz", "ood_orchestra", "ood_military", "ood_violin_guitar_solo"]

TITLES = {
    "caruso": "Enrico Caruso",
    "melba": "Nellie Melba",
    "piano": "Solo piano",
    "ood_jazz": "Jazz",
    "ood_orchestra": "Orchestra",
    "ood_military": "Military band",
    "ood_violin_guitar_solo": "Violin / guitar solo",
    "ood_blues": "Blues",
    "ood_country": "Country",
    "ood_flamenco": "Flamenco",
    "ood_oldtime": "Old-time",
    "ood_tango": "Tango",
    "ood_yodel": "Yodel",
}


def category_of(folder: str) -> str:
    # hist_caruso_0001 -> caruso ; hist_ood_tango_0002 -> ood_tango
    return folder.removeprefix("hist_").rsplit("_", 1)[0]


def default_title(folder: str) -> str:
    if folder.startswith("synth_test_modern_"):
        num = folder.split("_")[3]
        return f"Synthetic mixture {int(num)}"
    cat = category_of(folder)
    num = int(folder.rsplit("_", 1)[1])
    return f"{TITLES.get(cat, cat)} · {num}"


# --------------------------------------------------------------------------------------
def list_folders(prefix: str) -> list[str]:
    return sorted(p.name for p in SRC.iterdir() if p.is_dir() and p.name.startswith(prefix))


def detect_audio(src_dir: Path, model_ids, page_group: str | None = None) -> dict:
    """model id -> filename, using the first existing candidate from DEFAULT_MODELS."""
    audio = {}
    for mid in model_ids:
        m = DEFAULT_MODELS.get(mid)
        if not m or not m.get("default", True):
            continue
        if page_group and "groups" in m and page_group not in m["groups"]:
            continue
        for name in m["files"]:
            if (src_dir / name).exists():
                audio[mid] = name
                break
    return audio


def auto_config() -> dict:
    """Model definitions + every clip folder found in SRC, sorted into the three page groups."""
    models = {mid: {k: v for k, v in m.items() if k not in ("files", "default", "groups")} for mid, m in DEFAULT_MODELS.items()}
    cfg = {"models": models, "synthetic": [], "hist_music": [], "hist_vocal": []}
    for f in list_folders(""):
        if f.startswith("synth_"):
            group = "synthetic"
        elif f.startswith("hist_"):
            group = "hist_music" if category_of(f) in MUSIC_CATEGORIES else "hist_vocal"
        else:
            continue
        cfg[group].append({"folder": f, "audio": detect_audio(SRC / f, models, group)})
    return cfg


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"command failed: {' '.join(cmd)}\n{r.stderr}")
    return r.stdout


def duration_of(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out.strip())


def channels_of(path: Path) -> int:
    out = run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", str(path)])
    return int(out.strip())


def measure(src: Path, start: float = 0.0) -> tuple[float, float]:
    """Integrated loudness (LUFS) and sample peak (dBFS) via ffmpeg's ebur128 filter."""
    r = subprocess.run(["ffmpeg", "-nostats", "-ss", str(start), "-i", str(src), "-af", "ebur128=peak=sample", "-f", "null", "-"],
                       capture_output=True, text=True)
    summary = r.stderr.split("Summary:")[-1]
    lufs = float(re.search(r"\bI:\s+(-?[\d.]+) LUFS", summary).group(1))
    peak = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    return lufs, peak


def process(src: Path, out_audio: Path, out_spec: Path, gain_db: float, start: float = 0.0):
    vol = f"volume={gain_db:.2f}dB"
    # 256 kbps AAC with the lowpass raised to 20 kHz so the regenerated high band survives.
    bitrate = "256k" if channels_of(src) > 1 else "160k"
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-i", str(src), "-af", vol, "-c:a", "aac", "-b:a", bitrate,
         "-cutoff", "20000", "-movflags", "+faststart", str(out_audio)])
    graph = vol + ",showspectrumpic=s=2000x512:mode=combined:color=magma:scale=log:fscale=lin:drange=100:legend=0"
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-ac", "1", "-i", str(src), "-lavfi", graph,
         "-frames:v", "1", "-q:v", "2", "-pix_fmt", "yuvj420p", str(out_spec)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--auto", action="store_true", help="regenerate config.json from all clip folders found in SRC")
    args = ap.parse_args()

    if args.auto or not CONFIG.exists():
        CONFIG.write_text(json.dumps(auto_config(), indent=2) + "\n")
        print(f"wrote {CONFIG.name} from the folders in {SRC.name} -- edit it to curate")
    cfg = json.loads(CONFIG.read_text())
    models_cfg = cfg["models"]
    for mid, m in models_cfg.items():
        if "label" not in m:
            sys.exit(f"config.json: model {mid!r} needs a \"label\"")

    jobs = {}  # folder -> [(src wav, out m4a, out jpg, solo, start seconds)]
    manifest_sections = []
    for sec in SECTIONS:
        groups = []
        for grp in sec["groups"]:
            items = []
            for pick in cfg.get(grp["id"], []):
                folder = pick["folder"]
                src_dir = SRC / folder
                if not src_dir.is_dir():
                    sys.exit(f"config.json: no such folder {src_dir}")
                out_dir = ASSETS / folder
                out_dir.mkdir(parents=True, exist_ok=True)
                models = []
                duration = None
                start = float(pick.get("start", 0))  # seconds trimmed from the beginning of every model's audio
                if start < 0:
                    sys.exit(f"{folder}: \"start\" must be >= 0")
                audio = pick.get("audio") or detect_audio(src_dir, models_cfg)
                labels = pick.get("labels", {})
                for mid, name in audio.items():
                    if mid not in models_cfg:
                        sys.exit(f"{folder}: model {mid!r} is not defined under \"models\" in config.json. Defined: {', '.join(models_cfg)}")
                    src = src_dir / name  # a bare filename in the clip folder, or an absolute path
                    if not src.exists():
                        have = ", ".join(sorted(p.name for p in src_dir.glob("*.wav")))
                        sys.exit(f"{folder}: model {mid!r} points to {name!r}, which does not exist. Files here: {have}")
                    if duration is None:
                        duration = duration_of(src) - start
                        if duration <= 0:
                            sys.exit(f"{folder}: \"start\" ({start}s) is past the end of the audio")
                    solo = models_cfg[mid].get("level") == "solo"
                    jobs.setdefault(folder, []).append((src, out_dir / f"{mid}.m4a", out_dir / f"{mid}.jpg", solo, start))
                    entry = {"id": mid, "audio": f"assets/{folder}/{mid}.m4a", "spec": f"assets/{folder}/{mid}.jpg"}
                    if mid in labels:
                        entry["label"] = labels[mid]
                    models.append(entry)
                if not models:
                    sys.exit(f"{folder}: no audio mapped (add an \"audio\" object, or run --auto)")
                items.append({
                    "id": folder,
                    "title": pick.get("title") or default_title(folder),
                    "duration": round(duration, 3),
                    "models": models,
                })
            groups.append({**grp, "items": items})
        manifest_sections.append({**sec, "groups": groups})

    files = [j for js in jobs.values() for j in js]
    print(f"processing {len(files)} files ...")
    with ThreadPoolExecutor(max_workers=6) as pool:
        levels = dict(zip((j[0] for j in files), pool.map(lambda j: measure(j[0], j[4]), files)))
        futures = []
        for folder, js in jobs.items():
            # models of a clip share one loudness; "solo" files (stems) are matched individually
            shared = [levels[src] for src, _, _, solo, _ in js if not solo]
            target = min([TARGET_LUFS] + [l + PEAK_CEIL_DB - pk for l, pk in shared])
            if target < TARGET_LUFS - 0.05:
                print(f"  {folder}: peak headroom limits this sample to {target:.1f} LUFS")
            for src, out_a, out_s, solo, start in js:
                lufs, peak = levels[src]
                own = min(TARGET_LUFS, lufs + PEAK_CEIL_DB - peak)  # stem: as loud as possible up to the target
                futures.append(pool.submit(process, src, out_a, out_s, (own if solo else target) - lufs, start))
        for f in futures:
            f.result()

    # remove generated output that config.json no longer refers to (unused clips / models)
    for d in sorted(p for p in ASSETS.iterdir() if p.is_dir()):
        if d.name not in jobs:
            shutil.rmtree(d)
            print(f"  removed stale assets/{d.name}")
            continue
        keep = {out.name for _, a, j, _, _ in jobs[d.name] for out in (a, j)}
        for f in sorted(d.iterdir()):
            if f.name not in keep:
                f.unlink()
                print(f"  removed stale assets/{d.name}/{f.name}")

    manifest = {"models": models_cfg, "sections": manifest_sections}
    MANIFEST.write_text("window.DEMO = " + json.dumps(manifest, indent=2, ensure_ascii=False) + ";\n")
    total = sum(p.stat().st_size for p in ASSETS.rglob("*") if p.is_file())
    print(f"done. {MANIFEST.name} written; assets total {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
