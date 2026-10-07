"""Write `<name>.gltf.json` (glTF JSON with the binary buffer embedded as base64) next to or into
OUT for each GLB given. The app loads these when a host cannot serve .glb files.

    python3 tools/model/glb2json.py assets/*.glb --out DIR
"""
import argparse
import base64
import json
import os
import struct

ap = argparse.ArgumentParser()
ap.add_argument("glbs", nargs="+")
ap.add_argument("--out", default=None)
a = ap.parse_args()
for path in a.glbs:
    b = open(path, "rb").read()
    jlen = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20:20 + jlen])
    off = 20 + jlen
    blen = struct.unpack("<I", b[off:off + 4])[0]
    j["buffers"][0]["uri"] = "data:application/octet-stream;base64," + base64.b64encode(b[off + 8:off + 8 + blen]).decode()
    name = os.path.basename(path)[:-4] + ".gltf.json"
    out = os.path.join(a.out or os.path.dirname(path), name)
    with open(out, "w") as f:
        f.write(json.dumps(j, separators=(",", ":")))
    print(out, f"{os.path.getsize(out) / 1e6:.2f} MB")
