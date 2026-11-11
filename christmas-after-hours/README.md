# ODD HAUS — CHRISTMAS AFTER HOURS

A 40-second cinematic brand film that plays live in the browser: Three.js for picture, Web Audio
for sound, no video files and no audio samples. Christmas Eve, a snowed-in lane, one small record
and garment shop with the lights still on.

A rendered copy is in [`renders/odd-haus-christmas-after-hours.mp4`](renders/odd-haus-christmas-after-hours.mp4)
(1280×720, 24 fps, stereo).

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open the address Vite prints and press **Play film**. For a production build:

```bash
npm run build
```

```bash
npm run preview
```

Controls: Play / Pause (`Space`), Restart (`R`), Mute (`M`), scrub bar and `←` `→` (±1 s, `Shift` ±5 s),
Record, WAV export, Fullscreen (`F`). The picture is always a 16:9 frame fitted to the window.

URL options: `?autoplay` start immediately · `?t=22` open on a time · `?q=0|1|2` force quality
(high / medium / low; otherwise it steps down by itself if the frame rate drops) · `?clean` picture only ·
`?pick` click the cigarette tip on the artwork to recalibrate the smoke.

## The original character

`public/assets/oddhaus-character.webp` is the original ODD HAUS drawing, used exactly as supplied.
To swap in a different scan, replace that file (`.png`, `.webp` or `.jpg`, same base name).

- It is only ever a **flat print**: the wall poster, the tee, the record sleeve, the window card, a flyer
  and the end card. It is never rebuilt in 3D, redrawn, warped or animated.
- `src/art/character.js` keys the white paper out at load time so only the ink remains (a transparent
  plate). Nothing else touches its pixels; the "wear" on some prints only removes specks of ink.
- Eyes, brows, face, arms, hands, cigarette and cup do not move. The only motion near the poster is
  a separate smoke layer (`buildSmoke` in `src/world/fx.js`) floating a centimetre in front of the paper,
  plus light, grain and camera. The smoke starts at `CHARACTER.cigTip` in `src/config.js`.

If the file is missing the film still runs and shows an empty printer's slot instead of inventing a figure.

## Storyboard as built

Cuts sit on the eighth-note grid of the score (90 BPM → 15 bars = exactly 40.000 s).

| Time | Section | Set-ups |
|---|---|---|
| 00:00–00:05 | The winter street | wide down the lane · lamp head in the snow · the ODD HAUS fascia comes into frame |
| 00:05–00:10 | The store | shopfront push-in · the window display through frosted glass · rack focus from glass to poster |
| 00:10–00:16 | Records & music | turntable · stylus in the groove · speaker cone · the "now playing" sleeve |
| 00:16–00:22 | The garments | jacket and tee on the rail · pocket stitching · woven label · wrapping paper and bag · the print |
| 00:22–00:29 | The mascot | poster on the wall · slow pass over the ink · smoke rising from the cigarette |
| 00:29–00:35 | Christmas after hours | the wrapped gift · cassette · looking out through the window · back on the pavement |
| 00:35–00:40 | The identity | the shop goes dark bank by bank · paper end card, held still for the last 2.4 s |

24 set-ups in total (`src/film/timeline.js`). Each is a short dolly, slide or tilt with deterministic
hand-held drift. `timeline.checkPaths()` samples every move against the set's collision boxes; the
build reports any frame where the camera would be inside a wall or prop.

## How it is made

```
src/
  config.js            duration, tempo, palette, character asset, quality tiers
  main.js              clock, render loop, transport UI, recording, capture hooks
  core/
    paint.js           canvas "ink & paper" toolkit: wobbly ink lines, hatching, washes, worn lettering
    toon.js            cel / ink-wash ShaderMaterial: banded light with ragged edges, street and
                       interior light zones, window light spilling onto the snow, height fog
    post.js            depth of field · ink outlines with 8 fps line boil · bloom · subtle chromatic
                       aberration · vintage grade · animated paper · grain · dust · gate weave · vignette
  art/
    character.js       loads the original drawing, keys the paper out, prints it onto textures
    textures-env.js    brick, neighbour facades, snow, floor, walls, fascia, gilt window lettering
    textures-props.js  poster, flyers, sleeves, labels, hi-fi faces, jacket, tee, wrapping, end card
  world/
    street.js          lane, neighbours, lamp posts, utility pole and wires, bench, A-board
    store.js           brick piers, timber shopfront, glass, door, blade sign, icicle lights, the room
    interior.js        counter, turntable, speakers, record wall, bins, garment rail, wrapping table
    fx.js              snow particles, cigarette smoke, vinyl groove shader
    index.js           assembly + everything time-dependent (flicker, twinkle, lights going out)
  film/timeline.js     the edit: camera set-ups, focus pulls, end card
  audio/
    pattern.js         the score as data (also drives speaker cones and VU needles)
    score.js           Web Audio synthesis, mix automation, foley, offline WAV render
tools/render.mjs       headless frame-accurate renderer
```

Every animated value is a pure function of film time, so scrubbing to any point gives exactly the
frame and the bar of music that belong there, and the headless renderer can step frames in any order.

### Sound

One continuous piece, synthesised live: electric piano, a dusty swung break, warm bass and a vibraphone
line over a 15-bar progression in D minor that never repeats a bar. Outside the shop the record is
heard through the wall (low-passed) under wind and distant traffic; the cut to the interior at 00:10
opens it up; the door shuts at 00:33.7 and it goes back behind the glass. Foley: needle, cloth, paper,
door and latch, light switches. Vinyl crackle and a slight wow sit under everything.

### Recording an MP4

In the browser, **Record** restarts the film and captures canvas + audio with `MediaRecorder`
(MP4 where the browser supports it, otherwise WebM), then downloads the file.

For a frame-accurate master, independent of machine speed:

```bash
npm run build
```

```bash
npm run render -- --w 1920 --h 1080 --fps 30 --out renders/film-1080.mp4
```

This steps the film frame by frame in headless Chromium, renders the soundtrack with an
`OfflineAudioContext`, and muxes both with `ffmpeg` (which must be installed). Other commands:

```bash
npm run check
```

```bash
npm run stills
```

`check` reports console errors and camera collisions; `stills` writes one frame per set-up plus a contact
sheet. If Playwright cannot find a browser, run `npx playwright install chromium` once, or set
`CHROMIUM_PATH`.

## Fonts

Anton, Patrick Hand SC and Inter, all under the SIL Open Font License (`public/fonts/OFL.txt`).
