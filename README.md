# RESTORE audio demo page

Static page (no framework, no bundler). Plays each clip through the Web Audio API so you can
switch between models mid-playback at the same position, with a spectrogram per model.

## View it

Audio is fetched with `fetch()`, so the page must be served over HTTP (not opened as a file):

```bash
cd /Users/melissa/Desktop/Restoration/demo_page
python3 -m http.server 8000     # then open http://localhost:8000
```

To publish, upload this whole folder (GitHub Pages, any static host). About 70 MB for 8 clips.

## Everything you edit is in `config.json`

```jsonc
{
  "models": {                       // 1. which models exist = the buttons
    "input": { "label": "Input", "note": "The degraded recording.", "color": "#8a8378" },
    "ours":  { "label": "RESTORE", "note": "…", "color": "#b4382a", "ours": true }
    // add your own: "my_model": { "label": "…", "note": "…", "color": "#…" }
  },
  "hist_vocal": [                   // 2. which clips, per page section
    {
      "folder": "hist_ood_tango_0001",
      "title": "Tango",             //    optional card title
      "audio": {                    // 3. which audio file each model plays for THIS clip,
        "input": "0_degraded.wav",  //    in button order. Different clips can use different
        "unet":  "1_stage1_moliner_norm.wav",   // models and different files.
        "ours":  "5_mix_vme_crossv2_norm.wav"
      },
      "labels": { "ours": "RESTORE v2" }   //    optional: rename a button for this clip only
    }
  ]
}
```

- `models`: `label` is required; `note` is the sentence shown under the buttons when selected
  (HTML allowed); `color` is the dot colour; `"ours": true` gives the highlighted accent style.
- Sections are `synthetic`, `hist_music` (music only) and `hist_vocal` (vocals + music). Clips
  appear in list order.
- `audio`: model id -> filename inside the clip's folder in `SRC` (or an absolute path). The key
  order is the button order, so the first model is the one selected when the page loads. A clip
  may use any subset of the defined models. Leave `audio` out and the build guesses from the
  standard filenames.
- Every model id used in `audio` must exist under `models`; the build tells you if not.
- `"start": 5` (optional, seconds) trims that much from the beginning of **every** model's audio in
  the clip. The audio, spectrogram, timeline and loudness matching all use the trimmed clip, and
  every model is cut at the same sample so switching stays aligned. Leave it out for no trim.

Then rebuild and refresh the browser:

```bash
python3 build.py
```

`build.py` level-matches all models within a clip, encodes 256 kbps AAC, renders the spectrograms
and writes `manifest.js`. It also deletes generated files in `assets/` that config.json no longer
uses. You never convert audio yourself.

`python3 build.py --auto` regenerates `config.json` from scratch, using every clip folder it finds
in `SRC` (**this overwrites your edits**). `SRC` (the folder with the source wavs) is set at the
top of `build.py`.

## Grouping models (e.g. the RESTORE stems, or the synthetic set's clean target stems)

Optional fields on a model in `config.json`:

- `"group": "RESTORE stems"` puts the model in its own row under a toggle. A clip can have several
  grouped rows (e.g. "RESTORE stems" and, for the synthetic clips, "Clean target stems" right below
  it) -- rows are consecutive models that share the same `group`, so keep a group's models together
  in `audio`. Each *group label* has its own show/hide switch, shared by every clip that has that
  group and remembered in the browser once the viewer touches it (before that, a label open by
  default lists it in `GROUPS_OPEN_BY_DEFAULT` -- currently just "RESTORE stems" -- at the top of
  `player.js`; anything else starts closed). Models with no group always show.
- `"subgroup": "Content"` adds a small label in front of a cluster of buttons within a row.
- `"level": "solo"` matches the file's loudness on its own instead of together with the other models
  of the clip. Use it for stems: they are 15-35 dB quieter than a mix.
- `"debug": true` keeps the model off the page entirely (no button, on no clip) until the viewer turns
  on the **Debug mode** switch in the footer (off by default; change `debugOn`'s initial value at the
  top of `player.js`). Used for the synthetic set's "Clean target stems" -- the ground truth the
  RESTORE stems are trying to recover, useful to a developer but not something a general viewer
  needs. Toggling the switch reloads the page.

Grouped models are only decoded when you hover or select them, to keep memory down.

## Other things to edit

| What | Where |
| --- | --- |
| Section titles / intro text / page order | `SECTIONS` in `build.py` (list order = page order) |
| Hero text, abstract, authors, Paper/Code links | `index.html` (search for `TODO`) |
| Look and feel | `style.css` |
| Loudness target, AAC bitrate, spectrogram style | `build.py` (`TARGET_LUFS`, `process()`) |

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `style.css`, `player.js` | the page |
| `config.json` | models + clips + which audio each model uses (edit me) |
| `build.py` | config.json -> assets/ + manifest.js |
| `manifest.js` | generated, do not edit |
| `assets/<clip>/<model>.m4a` / `.jpg` | generated audio + spectrogram |
