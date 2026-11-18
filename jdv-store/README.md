# JEON DE VERO — walk the shop

A first-person, browser-based 3D walk-through of **JEON DE VERO (JDV Records & Goods)**: the record
wall under the mascot mural, the forest-green tile table on the striped rug, the checkerboard
accessory wall, the clothing rack, the stainless shelf with the boxed figure and the JDV Records
lightbox, a coffee bar, and the café terrace through the glass doors.

Everything is real-time Three.js geometry with real lighting, shadows and materials. No photos or
background plates are used. The mural, script logo and mascot are **your actual artwork**,
extracted from the reference image (see *Brand artwork* below).

Like the "spot the cats in the painting" idea, **five pocket-size Mini Vero mascots** are hidden
around the shop and terrace. It is still an exploration piece first: no timer, no score.

## Run it

```bash
npm install
npm run serve          # http://localhost:8080
```

Or open `dist/jdv-store.html` directly in a desktop browser (one file; three.js loads from the
jsDelivr CDN, so you need to be online). Rebuild it with `npm run build`.

| Key | Action |
|---|---|
| `W` `A` `S` `D` / arrows | Walk |
| Mouse | Look around (click the page to capture the mouse) |
| `Shift` | Walk faster |
| `E` | Interact: flip records, play the turntable, inspect goods, pick up a Mini Vero |
| `M` | Floor plan with your position |
| `Esc` | Release the mouse / pause |

If the browser won't capture the mouse (some embedded frames), the page falls back to
drag-to-look. On touch screens: drag on the left half to walk, on the right half to look, tap **E**.

## What you can do

- **Dig through crates**: `E` on any crate (record cabinet or the New Arrivals island) flips the front
  sleeve forward and shows the next record (title, artist, year, genre, grade). Keep going to riffle back.
- **Play the turntable**: the platter spins up to 33⅓, the tonearm swings onto the record and a
  generative lo-fi jazz side plays from the turntable's position (positional audio: walk away and it
  fades; step outside and it's muffled through the glass).
- **Inspect merch**: cap, tote, keychain, headphones, mug, crewnecks, the boxed figure, the
  JDV House Sessions LP and the jackets on the rack. Each comes up in a lit inspect view you can turn.
- **Coffee corner**: pull a shot on the espresso machine (grind, pump, steam), look at the pastry dome
  and pour-over station.
- **Lamps**: switch the mushroom lamps on and off.
- **Terrace**: the doors open as you approach. String lights, café tables, a board by the door.
- **Mini Veros**: Classic, Midnight, Burgundy, Forest and Gold. A collection toast tells you where you
  found each one; collect all five for a small thank-you.

<details><summary>Mini Vero locations (spoilers)</summary>

| Edition | Where |
|---|---|
| Classic | Lower floating shelf by the entrance, propping up the books |
| Midnight | Standing on top of the New Arrivals sign |
| Burgundy | Inside the green tile table, between the books and the tin box |
| Forest | Upper coffee shelf, beside the jars |
| Gold | Terrace bench, between the cushions |

</details>

## Floor plan (single source of truth)

`src/layout.js` defines one fixed floor plan in metres. Every mesh, every collider, every
interaction box and the in-game floor plan (`M`) read from it, so the room cannot change shape
depending on where you look.

```
 z=-9.4 ┌──────────── planters · hedge · trees · string-light poles ───────────┐
        │ bench           TERRACE (deck, 9.2 × 5.2 m)                   fence  │
        │ figs     table            table                 table              │
 z=-4.2 └──────────────┬──── glass doors ────┬─────────────────────────────────┘
 z=-4.0  ┌─────────────┤ fixed │ doors │fixed├── lightbox ── steel shelf ─[col]┐
         │ rack                                                       vitrine  │
         │ pegboard                         new-arrivals island                │
         │ sideboard (turntable, lamp)                                 bench   │
         │ ═══ MURAL ═══        green tile table                      frames  │
         │ record cabinet + crates   (rug, pendant)             ┃bar┃ back bar │
         │ stool                                                ┃   ┃ espresso │
         │ wall shelf     front window   fig   entrance         ┃   ┃          │
 z=+4.0  └─────────────────────────────────────────────────────────────────────┘
       x=-3.5                         (7 × 8 m shop, 3.3 m ceiling)          x=+3.5
```

You start just inside the entrance, looking diagonally toward the mural and the glass doors, which
reproduces the composition of the reference image.

## Brand artwork

`tools/extract_brand.py` reads `reference/jdv_store_reference.webp`, separates the mural from the
plaster by colour, upscales it 3× with smooth thresholding for crisp edges, recolours it to the
brand inks (navy `#1f2b45`, red `#a6382a`, cream `#f3e7cf`) and splits it into:

- the full mural lockup (mascot + script + RECORDS & GOODS badge): wall decal and title card
- the script logo alone: crewneck, tote, figure box, coffee bags, awning, window lettering
- the mascot head alone: mascot crewneck, hoodie, keychain, house-label LP sleeves

The output is `src/assets/brandArt.js` (data URIs). Re-run with `npm run brand` if the source image
changes. The 3D mascot figures (boxed figure, vitrine toys, Mini Veros) are modelled from
primitives to match the boxed figure in the reference: cream JDV cap, sleepy eyes, round nose,
handlebar moustache, shirt and tie.

## How it's built

| File | What |
|---|---|
| `src/layout.js` | Floor plan, furniture footprints, colliders, zones, spawn |
| `src/textures.js` | Procedural canvas textures: plaster, polished and board-formed concrete, walnut, oak, glazed tiles (with normal map), brushed steel, galvanised steel, rug, deck, foliage |
| `src/brand.js` | Signage, prints, packaging, menu board, record sleeves (64 designs + catalogue), book spines |
| `src/materials.js` | Shared PBR materials; instanced record/book materials pick their sleeve/spine per instance |
| `src/world/*.js` | Shell + glazing + doors, record wall + turntable, merch zones, coffee bar, centre table, plants, terrace + sky, lighting, mascot figure |
| `src/game/*.js` | Collision, controls, interaction raycasts, inspect view, collectibles, HUD, audio |
| `tools/serve.mjs` | Static server (`--offline` serves three.js from `node_modules`) |
| `tools/shots.mjs` | Headless screenshots from fixed viewpoints (Chromium + SwiftShader) |
| `tools/build.mjs` | Single-file bundles in `dist/` |

Rendering: ACES tone mapping, one low golden-hour sun casting shadows through the glazing mullions
and tree canopy, a shadowed pendant spot, warm track spots aimed at the mural and goods, an area
light at the glazing, and a reflection probe captured from the shop itself. Post: MSAA, bloom on
emissive fixtures only, vignette and fine grain. Static geometry is baked into one mesh per
material; records, books, leaves and string-light bulbs are instanced. Shadow maps are only redrawn
when something moves (doors, records). Resolution adapts if the frame rate drops.

Audio is synthesised live with WebAudio (no audio files): the record (Rhodes FM voices, upright
bass, brushed kit, vinyl crackle, through an HRTF panner at the turntable), room tone, leaves and
birds on the terrace, footsteps on concrete and decking, record flips, the espresso machine.

## Notes

- Desktop Chrome, Edge, Firefox and Safari with WebGL2. Phones work with touch controls but are
  much heavier to render.
- No Japanese text or unrelated cultural symbols are used anywhere; all signage is the JDV brand
  in English.
- Record titles and artists on the sleeves are fictional.
