Character models. Everything here is generated from code by `../tools/model/` (no hand-made or
downloaded assets):

| File | Built by | Contents |
|---|---|---|
| `chr_bully.glb` | `tools/model/chr_bully.py` | sculpted, skinned Bully (51 joints incl. 3-joint fingers), eye sockets, guitar mount, grips |
| `chr_mrodd.glb` | `tools/model/chr_mrodd.py` | sculpted, skinned Mr. ODD (robe, shawl collar, rope belt, slippers, 5-finger hands) |
| `chr_buddy.glb` | `tools/model/chr_buddy.py` | sculpted, skinned Buddy (layered fur clumps, ears, tail chain, tie, tag, collar) |
| `kit_tiny.glb` | `tools/model/kit_tiny.py` | glove (palm + pivoting fingers) and high-top sneaker shared by the small characters |

Rebuild (Blender as a Python module + numpy + scikit-image):

    python tools/model/build.py bully mrodd buddy kit_tiny [--preview DIR]

Any `chr_<id>.glb` dropped here replaces that character's procedural model automatically.
GLBs without a `height` extra are scaled to the character's height. Rig node names are listed in
../README.md ("Replacing a procedural character").
