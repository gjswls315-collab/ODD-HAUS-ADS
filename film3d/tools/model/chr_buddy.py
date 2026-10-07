"""Buddy - shaggy grey-brown terrier mix (shoulder ~0.40 m): fur sculpted as layered clumps that
flow over a real body (head -> tail, gravity on belly, ears, beard, legs), cream chest and beard,
floppy ears, brown eyes under furry brows, white shirt collar, blue tie with yellow stripes,
round metal BUDDY tag. Blender coordinates (Z up, dog faces -Y, left = +X)."""
import numpy as np
from sdf import (Grid, V, norm, sphere, ellipsoid, capsule, box, cylinder, torus, tube, bezier, lock,
                 halfspace, frame, euler, rot_x, rot_y, rot_z, fbm, vnoise, Prim, Union)
from charkit import Part, lin

LEGS = {
    # name: (top, joint, lower end, paw tip)
    "FL": ((0.066, -0.12, 0.29), (0.066, -0.098, 0.19), (0.066, -0.118, 0.066), (0.066, -0.152, 0.02)),
    "HL": ((0.072, 0.17, 0.3), (0.078, 0.118, 0.186), (0.078, 0.2, 0.088), (0.078, 0.172, 0.02)),
}


def leg(name, s):
    pts = LEGS[name]
    return [V(p[0] * s, p[1], p[2]) for p in pts]


HEAD = V(0, -0.255, 0.48)
EYE = {s: V(0.037 * s, -0.307, 0.497) for s in (1, -1)}
NOSE = V(0, -0.398, 0.455)


def bones():
    B = [
        dict(name="Body", head=(0, 0.03, 0.31), tail=(0, -0.07, 0.31)),
        dict(name="Hips", head=(0, 0.03, 0.31), tail=(0, 0.19, 0.31), parent="Body"),
        dict(name="Chest", head=(0, 0.03, 0.31), tail=(0, -0.13, 0.325), parent="Body"),
        dict(name="Neck", head=(0, -0.13, 0.335), tail=(0, -0.215, 0.435), parent="Chest"),
        dict(name="Head", head=(0, -0.215, 0.435), tail=(0, -0.31, 0.47), parent="Neck"),
        dict(name="Jaw", head=(0, -0.27, 0.43), tail=(0, -0.37, 0.425), parent="Head"),
        dict(name="EarL", head=(0.058, -0.24, 0.528), tail=(0.088, -0.252, 0.43), parent="Head"),
        dict(name="EarR", head=(-0.058, -0.24, 0.528), tail=(-0.088, -0.252, 0.43), parent="Head"),
        dict(name="Tail", head=(0, 0.235, 0.335), tail=(0, 0.285, 0.39), parent="Hips"),
        dict(name="Tail1", head=(0, 0.285, 0.39), tail=(0, 0.31, 0.445), parent="Tail"),
        dict(name="Tail2", head=(0, 0.31, 0.445), tail=(0, 0.318, 0.5), parent="Tail1"),
        dict(name="Tail3", head=(0, 0.318, 0.5), tail=(0, 0.31, 0.545), parent="Tail2"),
        dict(name="Tie", head=(0, -0.205, 0.372), tail=(0, -0.222, 0.27), parent="Neck"),
        dict(name="Tag", head=(0, -0.214, 0.36), tail=(0, -0.226, 0.33), parent="Neck"),
    ]
    for key, parent in (("FL", "Chest"), ("HL", "Hips")):
        for s, side in ((1, "L"), (-1, "R")):
            nm = f"Leg{key[0]}{side}"
            a, b, c, d = leg(key, s)
            B.append(dict(name=nm, head=tuple(a), tail=tuple(b), parent=parent, roll_to=(1, 0, 0)))
            B.append(dict(name=f"{nm}Lower", head=tuple(b), tail=tuple(c), parent=nm, roll_to=(1, 0, 0)))
            B.append(dict(name=f"{nm}Paw", head=tuple(c), tail=tuple(d), parent=f"{nm}Lower", roll_to=(1, 0, 0)))
    return B


# ------------------------------------------------------------------ body under the fur
def body_field(g, inflate=0.0):
    i = inflate
    g.add(ellipsoid((0, 0.03, 0.305), V(0.1, 0.2, 0.1) + i))
    g.add(ellipsoid((0, -0.1, 0.29), V(0.105, 0.1, 0.115) + i), k=0.05)
    g.add(ellipsoid((0, 0.17, 0.31), V(0.098, 0.085, 0.095) + i), k=0.05)
    g.add(capsule((0, -0.14, 0.33), (0, -0.215, 0.44), 0.066 + i, 0.06 + i), k=0.04)
    g.add(ellipsoid(HEAD + V(0, 0.01, 0.01), V(0.072, 0.078, 0.07) + i), k=0.03)
    g.add(capsule(HEAD + V(0, -0.04, -0.02), NOSE + V(0, 0.02, -0.006), 0.046 + i, 0.034 + i), k=0.03)   # muzzle
    for key in ("FL", "HL"):
        for s in (1, -1):
            a, b, c, d = leg(key, s)
            g.add(capsule(a, b, 0.042 + i, 0.03 + i), k=0.03)
            g.add(capsule(b, c, 0.03 + i, 0.022 + i), k=0.015)
            g.add(ellipsoid((c + d) / 2 + V(0, -0.005, -0.012), V(0.026, 0.036, 0.018) + i), k=0.012)
    g.add(tube(np.array([(0, 0.22, 0.33), (0, 0.285, 0.39), (0, 0.31, 0.445), (0, 0.318, 0.5), (0, 0.31, 0.545)]),
               np.array([0.03, 0.024, 0.02, 0.016, 0.012]) + i), k=0.02)


def region(p):
    """Fur flow direction + lock length + width for a body surface point."""
    x, y, z = p
    s = 1.0 if x >= 0 else -1.0
    head = np.linalg.norm(p - HEAD) < 0.095 or y < -0.29
    if y < -0.3 and z < 0.47:                                          # beard / muzzle underside
        return norm(V(0.15 * s, -0.25, -1.0)), 0.06, 0.024, "beard"
    if y < -0.32:                                                     # top of muzzle: short, toward nose
        return norm(V(0.4 * s, -0.6, 0.2)), 0.028, 0.02, "muzzle"
    if head and z > 0.5 and abs(x) < 0.05 and y < -0.27:              # brows: tufts forward over the eyes
        return norm(V(0.3 * s, -1.0, 0.45)), 0.04, 0.022, "brow"
    if head:
        return norm(V(0.35 * s, 0.75, -0.25)), 0.04, 0.026, "head"
    if z < 0.24 and abs(y - 0.03) < 0.16 and abs(x) < 0.09:           # belly fringe
        return norm(V(0.15 * s, 0.1, -1.0)), 0.07, 0.03, "belly"
    if z < 0.23:                                                      # legs
        return norm(V(0.05 * s, 0.05, -1.0)), 0.045 if z > 0.07 else 0.025, 0.024, "leg"
    if y > 0.22 and z > 0.33:                                         # tail plume
        return norm(V(0.4 * s, 0.6, 0.3)), 0.075, 0.03, "tail"
    if y < -0.08 and z < 0.36:                                        # fluffy chest
        return norm(V(0.25 * s, -0.25, -1.0)), 0.075, 0.032, "chest"
    if y < -0.12:                                                     # neck ruff
        return norm(V(0.5 * s, 0.4, -0.6)), 0.065, 0.03, "neck"
    return norm(V(0.75 * s, 0.45, -0.55)), 0.06, 0.03, "back"          # back + flanks: part line on the spine


def surface_samples(n, seed):
    g = Grid((-0.16, -0.46, -0.01), (0.16, 0.38, 0.62), 0.006)
    body_field(g)
    v, f = g.mesh()
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    cr = np.cross(b - a, c - a)
    area = np.linalg.norm(cr, axis=1)
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(f), size=n, p=area / area.sum())
    u, w = rng.random(n), rng.random(n)
    flip = u + w > 1
    u[flip], w[flip] = 1 - u[flip], 1 - w[flip]
    P = a[idx] + (b[idx] - a[idx]) * u[:, None] + (c[idx] - a[idx]) * w[:, None]
    N = cr[idx] / (area[idx][:, None] + 1e-12)
    return P, N


def build_fur():
    g = Grid((-0.2, -0.5, -0.01), (0.2, 0.42, 0.66), 0.0022)
    body_field(g)
    rng = np.random.default_rng(21)
    P, N = surface_samples(1500, 4)
    for p, n in zip(P, N):
        flow, L, w, kind = region(p)
        # skip the eyes, nose tip and paw pads
        if min(np.linalg.norm(p - EYE[1]), np.linalg.norm(p - EYE[-1])) < 0.024:
            continue
        if np.linalg.norm(p - NOSE) < 0.03 or p[2] < 0.012:
            continue
        if abs(np.linalg.norm((p - COLLAR_C) @ COLLAR_R[:, :2]) - 0.083) < 0.03 and abs((p - COLLAR_C) @ COLLAR_R[:, 2]) < 0.03:
            continue          # keep the shirt collar visible
        L *= rng.uniform(0.7, 1.1) * (0.85 if kind in ("back", "neck", "chest", "belly") else 1.0)
        w *= rng.uniform(0.8, 1.15)
        out = {"beard": 0.25, "muzzle": 0.35, "brow": 0.5, "head": 0.35, "belly": 0.2, "leg": 0.25,
               "tail": 0.45, "chest": 0.3, "neck": 0.35, "back": 0.35}[kind]
        d0 = norm(n * out + flow * (1 - out) + rng.normal(0, 0.12, 3))
        root = p - n * 0.006
        mid = root + d0 * L * 0.5 + n * L * 0.12
        tip = root + norm(d0 + V(0, 0, -0.35 * (kind not in ("brow", "tail")))) * L + rng.normal(0, 0.004, 3)
        pts = bezier(root, mid, tip, n=7)
        ww = w * 0.85 * np.array([1.0, 1.0, 0.95, 0.85, 0.72, 0.52, 0.3])
        g.add(lock(pts, ww, np.maximum(ww * 0.72, 0.0032), [n] * 7, k=0.004), k=0.005)
    # keep eyes and nose free, open the mouth line slightly
    for s in (1, -1):
        g.sub(ellipsoid(EYE[s] + V(0, -0.006, 0.002), (0.022, 0.016, 0.019)), k=0.006)
    g.sub(sphere(NOSE + V(0, -0.006, 0.002), 0.018), k=0.004)
    g.displace(lambda P: 0.0008 * fbm(P, 90, 2, 5))
    return g


def fur_paint(P, N):
    rng_n = vnoise(P, 45, 3) * 0.5 + 0.5
    grey = np.array(lin("#77706a")) / np.array(lin("#9a8f84"))
    brown = np.array(lin("#6a5544")) / np.array(lin("#9a8f84"))
    cream = np.array(lin("#d9cab0")) / np.array(lin("#9a8f84"))
    dark = np.array(lin("#3e342d")) / np.array(lin("#9a8f84"))
    col = grey * (1 - rng_n[:, None]) + brown * rng_n[:, None]
    # cream: chest, beard, under the muzzle, legs, belly
    c = np.zeros(len(P))
    c += np.clip((0.4 - P[:, 2]) / 0.08, 0, 1) * np.clip((-P[:, 1] - 0.08) / 0.06, 0, 1) * np.clip((0.12 - np.abs(P[:, 0])) / 0.05, 0, 1)
    c += np.clip((0.46 - P[:, 2]) / 0.04, 0, 1) * np.clip((-P[:, 1] - 0.28) / 0.03, 0, 1)
    c += np.clip((0.11 - P[:, 2]) / 0.05, 0, 1) * 0.75
    c += np.clip(-N[:, 2] - 0.3, 0, 1) * 0.3
    c = np.clip(c, 0, 1)[:, None]
    col = col * (1 - c) + cream * c
    # darker saddle and ears
    sad = np.clip((P[:, 2] - 0.36) / 0.04, 0, 1) * np.clip((np.abs(P[:, 1] - 0.03) < 0.2), 0, 1) * (P[:, 1] > -0.2)
    ears = np.zeros(len(P))
    for s in (1, -1):
        ears = np.maximum(ears, np.exp(-(np.linalg.norm(P - V(0.085 * s, -0.25, 0.47), axis=1) / 0.05) ** 2))
    dk = np.clip(sad * 0.55 + ears * 0.6, 0, 1)[:, None]
    col = col * (1 - dk) + dark * dk
    # light tips (distance from the body) and fine variation
    return col * (0.92 + 0.16 * vnoise(P, 260, 9))[:, None]


def build_ears():
    """Floppy ear flaps under the fur (gives the ears their weight and silhouette)."""
    g = Grid((-0.15, -0.32, 0.36), (0.15, -0.18, 0.56), 0.0018)
    for s in (1, -1):
        root = V(0.058 * s, -0.24, 0.528)
        pts = bezier(root, V(0.088 * s, -0.255, 0.5), V(0.094 * s, -0.255, 0.425), n=7)
        w = np.array([0.026, 0.034, 0.038, 0.038, 0.034, 0.026, 0.014])
        g.add(lock(pts, w, np.full(7, 0.009), [V(s, -0.1, 0.1)] * 7, k=0.004))
        rng = np.random.default_rng(int(7 + s))
        for i in range(26):
            t = rng.uniform(0.1, 1.0)
            p = bezier(root, V(0.088 * s, -0.255, 0.5), V(0.094 * s, -0.255, 0.425), n=30)[int(t * 29)]
            p = p + V(s * 0.008, rng.uniform(-0.022, 0.022), 0)
            tip = p + V(s * rng.uniform(0.0, 0.015), rng.uniform(-0.01, 0.01), -rng.uniform(0.03, 0.06))
            ww = rng.uniform(0.014, 0.02) * np.array([1, 0.95, 0.8, 0.55, 0.25])
            g.add(lock(bezier(p, (p + tip) / 2 + V(s * 0.006, 0, 0), tip, n=5), ww, np.maximum(ww * 0.5, 0.0025), [V(s, 0, 0)] * 5, k=0.002), k=0.003)
    return g


def ear_paint(P, N):
    dark = np.array(lin("#5a4c40")) / np.array(lin("#9a8f84"))
    return np.tile(dark, (len(P), 1)) * (0.9 + 0.2 * vnoise(P, 200, 3))[:, None]


def build_nose():
    g = Grid(NOSE - 0.04, NOSE + 0.04, 0.0008)
    g.add(ellipsoid(NOSE, (0.021, 0.016, 0.016)))
    g.add(ellipsoid(NOSE + V(0, 0.004, 0.006), (0.019, 0.016, 0.012)), k=0.006)
    for s in (1, -1):
        g.sub(ellipsoid(NOSE + V(0.008 * s, -0.014, -0.002), (0.0045, 0.004, 0.003), rot_z(25 * s)), k=0.002)
    g.sub(capsule(NOSE + V(0, -0.016, -0.006), NOSE + V(0, -0.012, -0.018), 0.0015), k=0.002)
    return g


COLLAR_C = V(0, -0.175, 0.385)
COLLAR_R = rot_x(-38)


def build_collar():
    """White shirt collar: band round the neck + two points at the throat."""
    g = Grid((-0.13, -0.31, 0.26), (0.13, -0.04, 0.47), 0.0014)
    c = COLLAR_C
    R = COLLAR_R
    for dz, rr in ((-0.009, 0.0915), (0.0, 0.09), (0.009, 0.0885)):        # folded band, not a wire
        g.add(torus(c + R @ V(0, 0, dz), rr, 0.0075, R @ np.diag([1.0, 1.1, 1.0])), k=0.008)
    for s in (1, -1):
        p0 = c + R @ V(0.01 * s, -0.088, 0.0)
        pts = bezier(p0 + V(0.018 * s, 0, 0.004), p0 + V(0.034 * s, -0.012, -0.022), p0 + V(0.03 * s, -0.018, -0.05), n=6)
        g.add(lock(pts, np.array([0.022, 0.028, 0.028, 0.024, 0.016, 0.006]), np.full(6, 0.0035), [V(0.2 * s, -1, 0.3)] * 6, k=0.002))
    return g


def build_tie():
    g = Grid((-0.06, -0.3, 0.2), (0.06, -0.15, 0.4), 0.001)
    top = V(0, -0.262, 0.358)
    g.add(ellipsoid(top, (0.014, 0.008, 0.011)))                     # knot
    pts = np.array([top + V(0, -0.002, -0.01), top + V(0, -0.012, -0.045), top + V(0, -0.018, -0.085)])
    w = np.array([0.011, 0.02, 0.026])
    g.add(lock(bezier(*pts, n=6), np.interp(np.linspace(0, 1, 6), [0, 0.5, 1], w), np.full(6, 0.0028),
               [V(0, -1, 0.15)] * 6, k=0.002), k=0.003)
    g.add(capsule(top + V(0, -0.018, -0.088), top + V(0, -0.017, -0.098), 0.012, 0.003), k=0.004)   # point
    return g


def tie_uv(P, N):
    return np.stack([P[:, 0], P[:, 2]], axis=1), None


def build_tag():
    g = Grid((-0.04, -0.29, 0.26), (0.04, -0.2, 0.36), 0.0006)
    c = V(0.02, -0.258, 0.312)
    g.add(cylinder(c, 0.017, 0.0022, 0.0012, rot_x(90 - 12)))
    g.add(torus(c + V(0, 0.002, 0.019), 0.0045, 0.0013, rot_y(90)))
    return g


def tag_uv(P, N):
    c = V(0.02, -0.258, 0.312)
    return np.stack([(P[:, 0] - c[0]) / 0.036 + 0.5, (P[:, 2] - c[2]) / 0.036 + 0.5], axis=1), None


def build(out, preview_dir=None):
    import charkit as ck
    import rigkit as rk
    allb = [b["name"] for b in bones() if b["name"] not in ("Tie", "Tag", "Jaw")]
    fur_bias = {"Body": 1.3, "Chest": 1.2, "Hips": 1.2}
    parts = [
        Part("Fur", build_fur, ("M_Fur", lin("#9a8f84"), 0.8, 0.0), bones=allb, paint=fur_paint, dec=52000, power=5, smooth=8, bias=fur_bias),
        Part("Ears", build_ears, ("M_Fur", lin("#9a8f84"), 0.8, 0.0), bones=["Head", "EarL", "EarR"], paint=ear_paint, dec=9000, power=5),
        Part("Nose", build_nose, ("M_Nose", lin("#141210"), 0.3, 0.0), rigid="Head", dec=2500, ao=0.5),
        Part("Collar", build_collar, ("M_Collar", lin("#f0ece4"), 0.8, 0.0), bones=["Neck", "Chest"], dec=5000, power=4),
        Part("Tie", build_tie, ("M_Tie", lin("#1e3f8f"), 0.55, 0.0), rigid="Tie", uv=tie_uv, dec=3000, ao=0.5),
        Part("Tag", build_tag, ("M_Tag", lin("#c9c3b4"), 0.3, 1.0), rigid="Tag", uv=tag_uv, dec=2000, ao=0.4),
    ]
    empties = [dict(name=f"Eye{'L' if s > 0 else 'R'}", pos=EYE[s], bone="Head",
                    props=dict(rx=0.0175, ry=0.0175, rz=0.0145, iris="#4a2a14", lid="#5a4c40", irisR=0.8, pupilR=0.42)) for s in (1, -1)]
    ao_obj = ck.build_character("buddy", bones(), parts, out, empties, extras=dict(character="buddy", height=0.56))
    if preview_dir:
        rk.preview(f"{preview_dir}/buddy", target=(0, -0.02, 0.3), dist=1.6, views=((0, 8), (40, 10), (90, 6), (150, 12)))
        rk.preview(f"{preview_dir}/buddy_face", target=(0, -0.3, 0.44), dist=0.6, views=((0, 4), (35, 8)), res=(560, 560))
    return ao_obj
