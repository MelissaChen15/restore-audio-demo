window.DEMO = {
  "models": {
    "input": {
      "label": "Input",
      "note": "The degraded recording, before any processing.",
      "color": "#8a8378"
    },
    "clean": {
      "label": "Clean reference",
      "note": "Ground-truth clean mixture (synthetic set only).",
      "color": "#5b7f6a"
    },
    "unet": {
      "label": "U-Net",
      "note": "Two-stage U-Net denoiser (Moliner &amp; V&auml;lim&auml;ki, 2022). Suppresses hiss and clicks; does not extend bandwidth.",
      "color": "#3f6fa6"
    },
    "htdemucs": {
      "label": "HT-Demucs",
      "note": "Pretrained HT-Demucs (Rouard et al., 2023), the backbone RESTORE is built on, used as an off-the-shelf baseline.",
      "color": "#2f8f8a"
    },
    "izotope": {
      "label": "iZotope RX",
      "note": "iZotope RX 12 Advanced with the archival chain: de-click, de-crackle, de-hum, spectral de-noise, spectral recovery.",
      "color": "#c98a1e"
    },
    "babe2": {
      "label": "BABE-2",
      "note": "Cascaded baseline: U-Net denoiser followed by the BABE-2 diffusion bandwidth-extension model (Moliner et al., 2024).",
      "color": "#7a5aa6"
    },
    "ours_lp": {
      "label": "RESTORE (ext. off)",
      "note": "Ours with the extension stem left out: the same separation and denoising, but no generated high frequencies, so the output stays band-limited.",
      "color": "#d0705f",
      "ours": true
    },
    "ours": {
      "label": "RESTORE (ext. on)",
      "note": "Ours. One forward pass splits the recording into stems; the restored mix is the content stems plus the generative high-frequency extension stem.",
      "color": "#b4382a",
      "ours": true
    },
    "vocals": {
      "label": "Vocals",
      "group": "RESTORE stems",
      "subgroup": "Content",
      "color": "#3d8b4b",
      "level": "solo",
      "note": "RESTORE's vocal stem on its own: the recovered voice at the recording's surviving bandwidth (before extension). Normalised separately so it is easy to hear."
    },
    "music": {
      "label": "Music",
      "group": "RESTORE stems",
      "subgroup": "Content",
      "color": "#6f9a2f",
      "level": "solo",
      "note": "RESTORE's music stem on its own: the accompaniment at the recording's surviving bandwidth (before extension). Normalised separately so it is easy to hear."
    },
    "broadband": {
      "label": "Broadband hiss",
      "group": "RESTORE stems",
      "subgroup": "Degradations",
      "color": "#7a766f",
      "level": "solo",
      "note": "The broadband hiss RESTORE separated out and removes. Boosted so it is audible: in the mix it is far quieter."
    },
    "transient": {
      "label": "Transient clicks",
      "group": "RESTORE stems",
      "subgroup": "Degradations",
      "color": "#6b675f",
      "level": "solo",
      "note": "The clicks and thumps RESTORE separated out and removes. Boosted so they are audible: in the mix they are far quieter."
    },
    "residual": {
      "label": "Residual",
      "group": "RESTORE stems",
      "subgroup": "Degradations",
      "color": "#948f87",
      "level": "solo",
      "note": "The catch-all stem for anything the other stems don't explain. It should stay close to silence. Boosted so it is audible."
    },
    "extension": {
      "label": "HF extension",
      "group": "RESTORE stems",
      "subgroup": "Generative",
      "color": "#b8892a",
      "level": "solo",
      "note": "The only synthesized content: the generated high-frequency extension, kept on its own stem so it stays auditable. Adding it to the content stems gives the full-band restoration."
    }
  },
  "sections": [
    {
      "id": "historical",
      "title": "Historical dataset",
      "intro": "Real 78&nbsp;RPM discs with no clean reference, trimmed to 60&nbsp;s. We separate two scenarios: recordings where a voice sings over the accompaniment, and instrumental recordings.",
      "groups": [
        {
          "id": "hist_vocal",
          "title": "Vocals + music",
          "intro": "Songs with a voice over light accompaniment. Each system outputs the full restored recording.",
          "items": [
            {
              "id": "hist_ood_flamenco_0001",
              "title": "Flamenco · 1",
              "duration": 56.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/hist_ood_flamenco_0001/input.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/hist_ood_flamenco_0001/unet.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/hist_ood_flamenco_0001/htdemucs.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/hist_ood_flamenco_0001/izotope.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/izotope.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/hist_ood_flamenco_0001/ours.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/hist_ood_flamenco_0001/ours_lp.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/ours_lp.jpg"
                },
                {
                  "id": "vocals",
                  "audio": "assets/hist_ood_flamenco_0001/vocals.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/vocals.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/hist_ood_flamenco_0001/music.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/hist_ood_flamenco_0001/broadband.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/hist_ood_flamenco_0001/transient.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/hist_ood_flamenco_0001/residual.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/hist_ood_flamenco_0001/extension.m4a",
                  "spec": "assets/hist_ood_flamenco_0001/extension.jpg"
                }
              ]
            },
            {
              "id": "hist_ood_tango_0001",
              "title": "Tango · 1",
              "duration": 55.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/hist_ood_tango_0001/input.m4a",
                  "spec": "assets/hist_ood_tango_0001/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/hist_ood_tango_0001/unet.m4a",
                  "spec": "assets/hist_ood_tango_0001/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/hist_ood_tango_0001/htdemucs.m4a",
                  "spec": "assets/hist_ood_tango_0001/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/hist_ood_tango_0001/izotope.m4a",
                  "spec": "assets/hist_ood_tango_0001/izotope.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/hist_ood_tango_0001/ours.m4a",
                  "spec": "assets/hist_ood_tango_0001/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/hist_ood_tango_0001/ours_lp.m4a",
                  "spec": "assets/hist_ood_tango_0001/ours_lp.jpg"
                },
                {
                  "id": "vocals",
                  "audio": "assets/hist_ood_tango_0001/vocals.m4a",
                  "spec": "assets/hist_ood_tango_0001/vocals.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/hist_ood_tango_0001/music.m4a",
                  "spec": "assets/hist_ood_tango_0001/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/hist_ood_tango_0001/broadband.m4a",
                  "spec": "assets/hist_ood_tango_0001/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/hist_ood_tango_0001/transient.m4a",
                  "spec": "assets/hist_ood_tango_0001/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/hist_ood_tango_0001/residual.m4a",
                  "spec": "assets/hist_ood_tango_0001/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/hist_ood_tango_0001/extension.m4a",
                  "spec": "assets/hist_ood_tango_0001/extension.jpg"
                }
              ]
            }
          ]
        },
        {
          "id": "hist_music",
          "title": "Music only",
          "intro": "Instrumental recordings. Each system outputs the music.",
          "items": [
            {
              "id": "hist_ood_jazz_0002",
              "title": "Jazz · 2",
              "duration": 54.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/hist_ood_jazz_0002/input.m4a",
                  "spec": "assets/hist_ood_jazz_0002/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/hist_ood_jazz_0002/unet.m4a",
                  "spec": "assets/hist_ood_jazz_0002/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/hist_ood_jazz_0002/htdemucs.m4a",
                  "spec": "assets/hist_ood_jazz_0002/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/hist_ood_jazz_0002/izotope.m4a",
                  "spec": "assets/hist_ood_jazz_0002/izotope.jpg"
                },
                {
                  "id": "babe2",
                  "audio": "assets/hist_ood_jazz_0002/babe2.m4a",
                  "spec": "assets/hist_ood_jazz_0002/babe2.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/hist_ood_jazz_0002/ours.m4a",
                  "spec": "assets/hist_ood_jazz_0002/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/hist_ood_jazz_0002/ours_lp.m4a",
                  "spec": "assets/hist_ood_jazz_0002/ours_lp.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/hist_ood_jazz_0002/music.m4a",
                  "spec": "assets/hist_ood_jazz_0002/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/hist_ood_jazz_0002/broadband.m4a",
                  "spec": "assets/hist_ood_jazz_0002/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/hist_ood_jazz_0002/transient.m4a",
                  "spec": "assets/hist_ood_jazz_0002/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/hist_ood_jazz_0002/residual.m4a",
                  "spec": "assets/hist_ood_jazz_0002/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/hist_ood_jazz_0002/extension.m4a",
                  "spec": "assets/hist_ood_jazz_0002/extension.jpg"
                }
              ]
            },
            {
              "id": "hist_ood_military_0002",
              "title": "Military band · 2",
              "duration": 55.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/hist_ood_military_0002/input.m4a",
                  "spec": "assets/hist_ood_military_0002/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/hist_ood_military_0002/unet.m4a",
                  "spec": "assets/hist_ood_military_0002/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/hist_ood_military_0002/htdemucs.m4a",
                  "spec": "assets/hist_ood_military_0002/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/hist_ood_military_0002/izotope.m4a",
                  "spec": "assets/hist_ood_military_0002/izotope.jpg"
                },
                {
                  "id": "babe2",
                  "audio": "assets/hist_ood_military_0002/babe2.m4a",
                  "spec": "assets/hist_ood_military_0002/babe2.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/hist_ood_military_0002/ours.m4a",
                  "spec": "assets/hist_ood_military_0002/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/hist_ood_military_0002/ours_lp.m4a",
                  "spec": "assets/hist_ood_military_0002/ours_lp.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/hist_ood_military_0002/music.m4a",
                  "spec": "assets/hist_ood_military_0002/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/hist_ood_military_0002/broadband.m4a",
                  "spec": "assets/hist_ood_military_0002/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/hist_ood_military_0002/transient.m4a",
                  "spec": "assets/hist_ood_military_0002/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/hist_ood_military_0002/residual.m4a",
                  "spec": "assets/hist_ood_military_0002/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/hist_ood_military_0002/extension.m4a",
                  "spec": "assets/hist_ood_military_0002/extension.jpg"
                }
              ]
            },
            {
              "id": "hist_ood_violin_guitar_solo_0001",
              "title": "Violin / guitar solo · 1",
              "duration": 57.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/input.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/unet.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/htdemucs.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/izotope.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/izotope.jpg"
                },
                {
                  "id": "babe2",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/babe2.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/babe2.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/ours.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/ours_lp.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/ours_lp.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/music.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/broadband.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/transient.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/residual.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/hist_ood_violin_guitar_solo_0001/extension.m4a",
                  "spec": "assets/hist_ood_violin_guitar_solo_0001/extension.jpg"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "synthetic",
      "title": "Synthetic dataset",
      "intro": "Clean vocal and instrumental stems are mixed and then degraded with a simulated historical recording chain (cutting-chain EQ, heavy band-limiting, gramophone noise, clicks and thumps). Because the degradation is synthetic, a clean reference exists for objective evaluation.",
      "groups": [
        {
          "id": "synthetic",
          "title": null,
          "intro": null,
          "items": [
            {
              "id": "synth_test_modern_0003_pass0",
              "title": "Synthetic mixture 3",
              "duration": 20.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/synth_test_modern_0003_pass0/input.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/synth_test_modern_0003_pass0/unet.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/synth_test_modern_0003_pass0/htdemucs.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/synth_test_modern_0003_pass0/izotope.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/izotope.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/synth_test_modern_0003_pass0/ours.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/synth_test_modern_0003_pass0/ours_lp.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/ours_lp.jpg"
                },
                {
                  "id": "vocals",
                  "audio": "assets/synth_test_modern_0003_pass0/vocals.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/vocals.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/synth_test_modern_0003_pass0/music.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/synth_test_modern_0003_pass0/broadband.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/synth_test_modern_0003_pass0/transient.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/synth_test_modern_0003_pass0/residual.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/synth_test_modern_0003_pass0/extension.m4a",
                  "spec": "assets/synth_test_modern_0003_pass0/extension.jpg"
                }
              ]
            },
            {
              "id": "synth_test_modern_0006_pass0",
              "title": "Synthetic mixture 6",
              "duration": 20.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/synth_test_modern_0006_pass0/input.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/synth_test_modern_0006_pass0/unet.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/synth_test_modern_0006_pass0/htdemucs.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/synth_test_modern_0006_pass0/izotope.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/izotope.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/synth_test_modern_0006_pass0/ours.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/synth_test_modern_0006_pass0/ours_lp.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/ours_lp.jpg"
                },
                {
                  "id": "vocals",
                  "audio": "assets/synth_test_modern_0006_pass0/vocals.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/vocals.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/synth_test_modern_0006_pass0/music.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/synth_test_modern_0006_pass0/broadband.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/synth_test_modern_0006_pass0/transient.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/synth_test_modern_0006_pass0/residual.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/synth_test_modern_0006_pass0/extension.m4a",
                  "spec": "assets/synth_test_modern_0006_pass0/extension.jpg"
                }
              ]
            },
            {
              "id": "synth_test_modern_0009_pass0",
              "title": "Synthetic mixture 9",
              "duration": 20.0,
              "models": [
                {
                  "id": "input",
                  "audio": "assets/synth_test_modern_0009_pass0/input.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/input.jpg"
                },
                {
                  "id": "unet",
                  "audio": "assets/synth_test_modern_0009_pass0/unet.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/unet.jpg"
                },
                {
                  "id": "htdemucs",
                  "audio": "assets/synth_test_modern_0009_pass0/htdemucs.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/htdemucs.jpg"
                },
                {
                  "id": "izotope",
                  "audio": "assets/synth_test_modern_0009_pass0/izotope.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/izotope.jpg"
                },
                {
                  "id": "ours",
                  "audio": "assets/synth_test_modern_0009_pass0/ours.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/ours.jpg"
                },
                {
                  "id": "ours_lp",
                  "audio": "assets/synth_test_modern_0009_pass0/ours_lp.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/ours_lp.jpg"
                },
                {
                  "id": "vocals",
                  "audio": "assets/synth_test_modern_0009_pass0/vocals.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/vocals.jpg"
                },
                {
                  "id": "music",
                  "audio": "assets/synth_test_modern_0009_pass0/music.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/music.jpg"
                },
                {
                  "id": "broadband",
                  "audio": "assets/synth_test_modern_0009_pass0/broadband.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/broadband.jpg"
                },
                {
                  "id": "transient",
                  "audio": "assets/synth_test_modern_0009_pass0/transient.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/transient.jpg"
                },
                {
                  "id": "residual",
                  "audio": "assets/synth_test_modern_0009_pass0/residual.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/residual.jpg"
                },
                {
                  "id": "extension",
                  "audio": "assets/synth_test_modern_0009_pass0/extension.m4a",
                  "spec": "assets/synth_test_modern_0009_pass0/extension.jpg"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
