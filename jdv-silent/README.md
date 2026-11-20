# The Early Shift (첫 판) — a JEON DE VERO silent film

A 47-second one-reel silent comedy made entirely in code, following the **1920s Silent Film** style from
[Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar): an ink-and-wash drawing printed on flickering silver
stock, projected as a 4:3 print between velvet curtains, intertitles instead of voices, and a cinema pianist who
plays every beat. The set is the JEON DE VERO shop from [`../jdv-store`](../jdv-store), redrawn by the ink pass.

**Story.** An hour before opening, the shop's mascot figure digs the house record out of a crate (his own face is
on the sleeve), chases it to the turntable, drags the tonearm across, and the pianist stops. Silence. The needle
drops, a foxtrot starts, the shop's lamps come on one by one, he tips his cap to us, and the print burns through.

| Deliverable | |
|---|---|
| `jdv-silent.mp4` | 1920×1080, 24 fps, −14 LUFS |
| `poster.jpg` | the end card |
| `subtitles_ko.srt` | the intertitles (they are burned into the picture, so the file is not named after the video) |
| `TREATMENT.md` | structures, shot list, beat sheet, cue map, sound design |
| `CREDITS` | code, fonts and style sources with their licences |

## How it's made

```
timeline.json (cue sheet: sections, tempi, every gag as a named hit)  ← tools/timeline.py
   ├─► picture: index.html → window.render(t)
   │      3D shop set + rigged figure (grey tonal painting, motion sampled at 16/20 fps: hand-cranked)
   │      → Redraw (XDoG ink line, 5-step wash, 45° hatching that boils every 2 frames)
   │      → iris / intertitle → FilmPost (silver/sepia print, flicker, weave, scratches, edge burn, grain)
   │      → 4:3 gate, dust and hair, velvet curtains lit by the screen and footlights, the burn-through
   ├─► score: score/score.py — synthesised upright piano, photoplay cue sheet, mickey-mousing every hit;
   │          the projector (lamp click, motor, claw purr, film flapping on the reel)
   └─► tools/mux.py — two-pass loudnorm to −14 LUFS, light grain, poster, srt
```

```sh
cd ../jdv-store && npm install && cd ../jdv-silent
./build.sh            # ≈ 10 minutes on 3 CPU workers (software WebGL), faster on a GPU
```

Review stills: `node tools/render.mjs stills 5,12.4,30.2` → `out/stills/`.

Tint plan: cold and scratchy until the needle drops (sepia ≈ 0.12, more damage, undercranked flicker in the chase),
warm and clean after (sepia ≈ 0.34). Every music cue is computed from the same `timeline.json` as the picture, so
flips, the boing, the trill, the silence, the needle drop and each lamp land on their frames (`out/cues.txt`).
