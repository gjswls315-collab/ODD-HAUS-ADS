# The Early Shift (첫 판) — a JEON DE VERO silent film

A 65-second one-reel silent comedy made entirely in code, following the **1920s Silent Film** style from
[Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar): an ink-and-wash drawing printed on flickering silver
stock, projected as a 4:3 print between velvet curtains, and a cinema pianist who plays every beat. The set is the
JEON DE VERO shop from [`../jdv-store`](../jdv-store), redrawn by the ink pass. There are no words: the cards carry
only the brand's own marks, and there are no subtitles.

**Story.** An hour before opening, Jeon de Vero himself (JDV cap, sleepy eyes, moustache, cigarette, black JDV tee,
baggy trousers) skates in off the terrace, ollies, flips his board into his hand, makes an espresso and peeks at us over
the bar: the iris closes on his face and opens on his *peek* logo. He digs the house record out of a crate (his own
face is on the sleeve: a double take), drags the tonearm across, and the pianist stops. Silence. The needle drops, the
foxtrot starts, the lamps come on one by one, a toy of himself dances behind his back and freezes whenever he looks,
and he signs off behind a smoke ring that closes on his *sign* logo before the print burns through.

| Deliverable | |
|---|---|
| `jdv-silent.mp4` | 1920×1080, 24 fps, −14 LUFS |
| `poster.jpg` | the *sign* card |
| `TREATMENT.md` | structures, shot list, beat sheet, cue map, sound design |
| `CREDITS` | code, fonts, brand art and style sources with their licences |

## How it's made

```
timeline.json (cue sheet: sections, tempi, every gag as a named hit)  ← tools/timeline.py
   ├─► picture: index.html → window.render(t)
   │      3D shop set + Jeon de Vero (rigged 3D body, the brand's drawn head as a paper-puppet sprite that
   │      faces the lens and flips when he turns) + the toy; grey tonal painting, motion sampled at 16/20 fps
   │      → Redraw (XDoG ink line, 5-step wash, 45° hatching that boils every 2 frames)
   │      → irises (one on his face, one made of his smoke ring) / logo cards → FilmPost (silver/sepia print,
   │        flicker, weave, scratches, edge burn, grain)
   │      → 4:3 gate, dust and hair, velvet curtains lit by the screen and footlights, the burn-through
   ├─► score: score/score.py — synthesised upright piano, photoplay cue sheet, mickey-mousing every hit,
   │          stop-time for the toy gag; the projector (lamp click, motor, claw purr, film flapping on the reel)
   └─► tools/mux.py — two-pass loudnorm to −14 LUFS, poster
tools/extract_art.py — cuts the logo marks and the head from reference/jdv_logo_sheet.webp into src/assets/jdvArt.js
```

```sh
cd ../jdv-store && npm install && cd ../jdv-silent
./build.sh            # ≈ 15 minutes on 3 CPU workers (software WebGL), faster on a GPU
```

Review: `node tools/render.mjs stills 8.4,23.6,47.5` → `out/stills/`; `node tools/probe.mjs 29,45.6` prints where he
lands in the frame (`--raw` saves the raw 3D render).

Tint plan: cold and scratchy until the needle drops (sepia ≈ 0.12–0.18, undercranked flicker on the board and in the
crates), warm and clean after (sepia ≈ 0.34). Every music cue is computed from the same `timeline.json` as the picture,
so pushes, the ollie, the skid, the flips, the silence, the needle drop, each lamp and each stop-time land on their
frames (`out/cues.txt`).
