# ODD HAUS — 3D brand film (real-time Three.js production)

Everything you see is **real 3D geometry rendered live**: eight procedurally modelled, rigged
characters inside a modelled ODD HAUS interior, filmed by a moving virtual camera with depth of
field, shadows, bloom and grain. No storyboard images, cutouts or background plates are used
anywhere. The reference images in `../reference/` were used only to understand mood, scale and
character design.

## Review build 1 (first delivery)

| Deliverable | Where |
|---|---|
| A. Scale lineup inside the house | `index.html?mode=lineup` (default) · `renders/review1/lineup_*.jpg` |
| B. Free camera preview | `index.html?mode=free` (orbit, pan, zoom, WASD/QE fly) |
| C. Test shots | `?mode=shot&shot=A` / `B` / `C`, `?mode=reel` for all three · `renders/review1/shot_*.mp4`, `test_shots_ABC.mp4` |

- **Shot A** — the tiny friends cross the house at night with Buddy (floor-level tracking, rug-fringe foreground, record-shelf bokeh).
- **Shot B** — a fallen book blocks the gap between coffee table and sofa; Bully's hand comes down, lifts it (two-bone IK), tilt-up reveal of Bully (backward cap, guitar); he checks the hallway, then signals GO; everyone scurries past.
- **Shot C** — Mr. ODD arrives from the hallway. Tiny-POV tilt: slipper → robe → mug → moustache → eyes. Reverse over his shoulder: everyone frozen, Buddy's ears down, Bully quiet.

The film view shows **no text at all** (no captions, scene numbers or timestamps). The only UI is
the review bar (auto-hides during shots) and the optional debug HUD.

## Run it

```bash
npm install            # three (+ playwright for headless renders)
npm run serve          # http://localhost:8080  (three.js loads from the jsDelivr CDN)
```

URL parameters: `mode=lineup|free|shot|reel`, `shot=A|B|C`, `debug=1`.

Keys: `SPACE` play/pause · `R` restart · `1` lineup · `2` `3` `4` shots A–C · `5` reel · `6` free camera ·
`←/→` scrub ±1 s · `L` labels (lineup) · free camera: drag/right-drag/scroll, `WASD` + `QE`, `Shift` faster.

`?debug=1` shows film time, scene, shot, camera position/FOV, depth-of-field, which assets are GLB vs
procedural, FPS, draw calls and triangles.

## Headless renders

```bash
node tools/capture.mjs video  --query "mode=shot&shot=A" --w 1280 --h 720 --fps 24 --out renders/review1/shot_A.mp4
node tools/capture.mjs stills --query "mode=lineup" --times 0.5 --out renders/review1 --prefix lineup \
     --cams '[{"pos":[-0.85,1.05,1.0],"target":[-0.9,0.72,-2.65],"fov":38}]'
```

Every animation is a pure function of time, so any frame renders identically in any order.
Capture runs Chromium + SwiftShader (no GPU needed) and serves the CDN imports from `node_modules`.

## Architecture

```
src/
  core/      util (easing, noise, paths) · textures (all canvas-painted) · mats · geo (eyes, gloves,
             hands, sneakers, fur/hair clumps, contact shadows) · stage (renderer + DoF/bloom/grade)
  characters/
    base.js     CharacterRoot / VisualModel / AnimationController, GLB-first loader, TinyController
    tinyrig.js  shared biped for the object characters
    tiny.js     Vin, Picker, A.A., Locke, Rex
    buddy.js    Buddy + DogController (4-leg walk/trot, sniff, ear perk/down, tail wag, lie down)
    human.js    human skeleton + HumanController (walk, crouch IK, look, gestures, 2-bone arm IK)
    bully.js    Bully (+ red flying-V)       mrodd.js  Mr. ODD (+ mug)
  world/house.js  the ODD HAUS interior + night lighting rig
  film/shots.js   lineup, free-camera staging, test shots A/B/C
```

Film logic never touches geometry: shots only write a `CharacterState`
(`pos, yaw, dist, moving, run, look, freeze, crouch, custom{…}`) and the character's
`AnimationController` turns that into joint transforms on named rig nodes.

## Replacing a procedural character with a final GLB

Drop `assets/chr_<id>.glb` (ids: `vin picker aa locke rex buddy bully mrodd`). On load each character
tries the GLB first and falls back to the procedural model, so no scene code changes. The GLB is
scaled to the character's height automatically. Name the rig nodes like this so the existing
controllers drive them:

| Rig node | Used for |
|---|---|
| `AnimationPivot` | root bob / lean / sway |
| `Body` | hips (humans) or main body (objects, dog) |
| `Spine`, `Chest`, `Neck`, `Head` | torso + look-at (humans, dog uses `Neck`/`Head`) |
| `EyeL`, `EyeR` | optional; procedural eyes expose look + lids |
| `LeftArm`, `LeftForeArm`, `LeftHand` (+ Right…) | arm swing, gestures, IK |
| `LeftLeg`, `LeftShin`, `LeftFoot` (+ Right…) | walk cycle, crouch |
| Dog: `LegFL/FR/HL/HR` (+`…Lower`, `…Paw`), `EarL/R`, `Tail`, `Tail1-3`, `Tie`, `Tag` | quadruped gait + secondary motion |

Missing nodes are simply skipped (root motion still works).

## Scale (metres)

Picker 0.23 · Vin 0.25 · A.A. 0.28 · Locke 0.30 · Rex 0.35 · Buddy 0.52 (≈0.40 at the shoulder) ·
Bully 1.50 · Mr. ODD 1.80.
