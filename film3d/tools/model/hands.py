"""Five-finger stylised hand: sculpt + finger bones (3 per finger).

Local hand frame (columns of R): x = palm normal, y = thumb side, z = back toward the wrist
(fingers extend along -z). Origin at the wrist joint."""
import numpy as np
from sdf import V, norm, box, ellipsoid, sphere, capsule, tube

FINGERS = {
    #          base (local)              splay  segment lengths            radii
    "Index": ((0.002, 0.028, -0.085), 7.0, (0.031, 0.021, 0.018), (0.0112, 0.0102, 0.0094, 0.0088)),
    "Middle": ((0.002, 0.009, -0.088), 1.0, (0.034, 0.023, 0.019), (0.0115, 0.0105, 0.0096, 0.009)),
    "Ring": ((0.002, -0.0105, -0.086), -4.0, (0.032, 0.022, 0.018), (0.011, 0.0101, 0.0093, 0.0087)),
    "Pinky": ((0.001, -0.029, -0.08), -10.0, (0.025, 0.017, 0.015), (0.0098, 0.009, 0.0084, 0.0079)),
}
THUMB = ((0.011, 0.031, -0.02), (0.45, 0.62, -0.64), (0.03, 0.024, 0.02), (0.0155, 0.013, 0.0117, 0.0106))
REST_CURL = (8.0, 11.0, 8.0)


def _curl(d, deg):
    x = V(1, 0, 0)
    a = np.radians(deg)
    return norm(d * np.cos(a) + x * np.sin(a))


def chains(H):
    """Joint positions (local) for each digit: {name: [p0, p1, p2, p3]}, radii."""
    k = H.get("scale", 1.0)
    out = {}
    for name, (base, splay, lens, radii) in FINGERS.items():
        d = V(0, np.sin(np.radians(splay)), -np.cos(np.radians(splay)))
        p = V(base) * k
        pts = [p]
        for L, c in zip(lens, REST_CURL):
            d = _curl(d, c)
            p = p + d * L * k
            pts.append(p)
        out[name] = (np.array(pts), np.array(radii) * k * H.get("chub", 1.0))
    base, d0, lens, radii = THUMB
    d = norm(V(d0))
    p = V(base) * k
    pts = [p]
    for i, L in enumerate(lens):
        p = p + d * L * k
        pts.append(p)
        d = norm(d + V(0.12, -0.08, -0.05))
    out["Thumb"] = (np.array(pts), np.array(radii) * k * H.get("chub", 1.0))
    return out


def sculpt(g, W, R, H):
    k = H.get("scale", 1.0)
    w = lambda p: W + R @ V(p)
    px, py, pz = H.get("palm", (0.0175, 0.04, 0.041))
    g.add(capsule(w((0, 0, 0.02)), w((0, 0, -0.02)), 0.03 * k, 0.031 * k), k=0.015)
    g.add(box(w((0, 0, -0.047 * k)), V(px, py, pz) * k, 0.016 * k, R), k=0.018 * k)
    g.add(ellipsoid(w(V(0.008, 0.004, -0.05) * k), V(0.015, 0.037, 0.038) * k, R), k=0.01 * k)
    g.add(ellipsoid(w(V(0.013, 0.026, -0.03) * k), V(0.016, 0.018, 0.027) * k, R), k=0.012 * k)
    for name, (pts, radii) in chains(H).items():
        wp = np.array([w(p) for p in pts])
        g.add(tube(wp, radii), k=(0.009 if name != "Thumb" else 0.012) * k)
        if name != "Thumb":
            g.add(sphere(w(pts[0] + V(-0.008, 0, 0.004) * k), 0.0095 * k), k=0.006 * k)   # knuckle


def bones(side, W, R, H, parent):
    k = H.get("scale", 1.0)
    w = lambda p: tuple(W + R @ V(p))
    palm_n = tuple(R @ V(1, 0, 0))
    out = [dict(name=f"{side}Hand", head=w((0, 0, 0)), tail=w((0, 0, -0.082 * k)), parent=parent, roll_to=palm_n)]
    for name, (pts, radii) in chains(H).items():
        par = f"{side}Hand"
        for i in range(3):
            nm = f"{side}{name}{i + 1}"
            out.append(dict(name=nm, head=w(pts[i]), tail=w(pts[i + 1]), parent=par, roll_to=palm_n))
            par = nm
    return out
