"""Build character GLBs.

    <venv with bpy+numpy+scikit-image>/bin/python tools/model/build.py bully [--preview DIR]

Writes film3d/assets/chr_<id>.glb, which the app loads in place of the procedural model."""
import argparse
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ASSETS = os.path.normpath(os.path.join(HERE, "..", "..", "assets"))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="+")
    ap.add_argument("--preview", default=None)
    ap.add_argument("--out", default=ASSETS)
    a = ap.parse_args()
    for cid in a.ids:
        name = cid if cid.startswith("kit_") else f"chr_{cid}"
        mod = importlib.import_module(name)
        mod.build(os.path.join(a.out, f"{name}.glb"), a.preview)
