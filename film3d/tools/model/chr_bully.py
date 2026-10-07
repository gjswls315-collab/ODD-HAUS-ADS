"""Bully - 1.50 m, chunky 12-year-old: big blond messy hair under a backward black cap,
rosy cheeks, gap-toothed grin, black skull tee, studded wristband, baggy olive cargo pants,
black high-top sneakers. Blender coordinates (Z up, faces -Y, left = +X)."""
import numpy as np
from sdf import (Grid, V, norm, sphere, ellipsoid, capsule, box, cylinder, torus, tube, bezier, lock,
                 halfspace, frame, euler, rot_x, rot_y, rot_z, fbm, vnoise, Prim)
from charkit import Part, lin
import hands

# ------------------------------------------------------------------ skeleton (metres)
# The head is sculpted in its own space around OLD_C and placed at HEAD_AT, scaled by HS
# (big Pixar-style kid head, ~4.6 heads tall overall).
OLD_C = V(0, 0.0, 1.355)
HEAD_AT = V(0, 0.0, 1.318)
HS = 1.17
HEAD_C = OLD_C
S_Z = 1.075                       # shoulder joint height
ABD = 22.0                        # rest arm abduction (deg)


def hp(p):
    """head-space point -> body space"""
    return HEAD_AT + (V(p) - OLD_C) * HS


def placed(build):
    def f():
        return build().place(OLD_C, HEAD_AT, HS)
    return f


def arm_pts(s):
    S = V(0.178 * s, 0.012, S_Z)
    d = norm(V(np.sin(np.radians(ABD)) * s, -0.05, -np.cos(np.radians(ABD))))
    E = S + d * 0.225
    d2 = norm(d + V(0, -0.12, 0.02))
    W = E + d2 * 0.2
    return S, E, W, d, d2


def leg_pts(s):
    H = V(0.09 * s, 0.0, 0.67)
    K = V(0.095 * s, -0.01, 0.38)
    A = V(0.097 * s, 0.005, 0.088)
    B = V(0.097 * s, -0.125, 0.03)    # ball of foot
    T = V(0.097 * s, -0.205, 0.03)
    return H, K, A, B, T


def hand_frame(s):
    S, E, W, d, d2 = arm_pts(s)
    f = d2
    medial = V(-s, 0, 0)
    pn = norm(medial - f * (medial @ f))           # palm normal (palm faces the thigh)
    t = norm(np.cross(f, pn) * s)                  # thumb side (toward front)
    if t[1] > 0:
        t = -t
    R = np.stack([pn, t, -f], axis=1)              # local x = palm normal, y = thumb side, -z = fingers
    return W, R


def bones():
    B = [
        dict(name="Body", head=(0, 0, 0.72), tail=(0, 0, 0.80)),
        dict(name="Spine", head=(0, 0, 0.80), tail=(0, 0, 0.90), parent="Body"),
        dict(name="Chest", head=(0, 0, 0.90), tail=(0, 0.005, 1.075), parent="Spine"),
        dict(name="Neck", head=(0, 0.01, 1.09), tail=(0, 0.01, 1.18), parent="Chest"),
        dict(name="Head", head=(0, 0.01, 1.18), tail=(0, 0.01, 1.45), parent="Neck"),
    ]
    for s, nm in ((1, "Left"), (-1, "Right")):
        S, E, W, d, d2 = arm_pts(s)
        B.append(dict(name=f"{nm}Shoulder", head=(0.035 * s, 0.01, 1.05), tail=tuple(S), parent="Chest"))
        B.append(dict(name=f"{nm}Arm", head=tuple(S), tail=tuple(E), parent=f"{nm}Shoulder", roll_to=(0, -1, 0)))
        B.append(dict(name=f"{nm}ForeArm", head=tuple(E), tail=tuple(W), parent=f"{nm}Arm", roll_to=(0, -1, 0)))
        Wp, R = hand_frame(s)
        B += hands.bones(nm, Wp, R, HAND, f"{nm}ForeArm")
        H, K, A, Bl, T = leg_pts(s)
        B.append(dict(name=f"{nm}Leg", head=tuple(H), tail=tuple(K), parent="Body", roll_to=(0, -1, 0)))
        B.append(dict(name=f"{nm}Shin", head=tuple(K), tail=tuple(A), parent=f"{nm}Leg", roll_to=(0, -1, 0)))
        B.append(dict(name=f"{nm}Foot", head=tuple(A), tail=tuple(Bl), parent=f"{nm}Shin", roll_to=(0, 0, 1)))
        B.append(dict(name=f"{nm}Toe", head=tuple(Bl), tail=tuple(T), parent=f"{nm}Foot", roll_to=(0, 0, 1)))
    return B


HAND = dict(scale=1.12, palm=(0.018, 0.043, 0.042), chub=1.08)

# ------------------------------------------------------------------ head
EYE = {s: V(0.043 * s, -0.087, 1.362) for s in (1, -1)}


def mouth_curve(n=9, open_=1.0):
    return bezier((-0.046, -0.097, 1.3), (0.0, -0.127, 1.258 - 0.004 * open_), (0.046, -0.097, 1.3), n=n)


def build_head():
    g = Grid((-0.13, -0.15, 1.13), (0.13, 0.13, 1.50), 0.0019)
    c = HEAD_C
    g.add(ellipsoid(c + V(0, 0.012, 0.032), (0.104, 0.11, 0.108)))
    g.add(ellipsoid(c + V(0, -0.018, -0.045), (0.099, 0.094, 0.082)), k=0.04)
    for s in (1, -1):
        g.add(sphere(V(0.058 * s, -0.064, 1.302), 0.046), k=0.035)              # chubby cheeks
        g.add(sphere(V(0.048 * s, -0.085, 1.385), 0.018), k=0.02)               # brow bulge
    g.add(sphere(V(0, -0.072, 1.255), 0.036), k=0.03)                           # chin
    g.add(capsule((0, 0.012, 1.13), (0, 0.008, 1.29), 0.054), k=0.03)           # neck
    # nose: button
    g.add(capsule((0, -0.098, 1.362), (0, -0.118, 1.328), 0.011, 0.019), k=0.014)
    for s in (1, -1):
        g.add(sphere(V(0.014 * s, -0.112, 1.322), 0.011), k=0.008)              # nose wings
        g.sub(sphere(V(0.0095 * s, -0.121, 1.315), 0.0052), k=0.003)           # nostrils
    # eye sockets
    for s in (1, -1):
        g.sub(ellipsoid(EYE[s] + V(0, -0.006, 0), (0.029, 0.02, 0.031)), k=0.012)
    # ears
    for s in (1, -1):
        R = euler(0, -18 * s, -10 * s)
        g.add(ellipsoid(V(0.104 * s, 0.006, 1.345), (0.015, 0.027, 0.036), R), k=0.012)
        g.sub(ellipsoid(V(0.116 * s, 0.002, 1.343), (0.007, 0.017, 0.024), R), k=0.004)
    # mouth: wide grin, then a lower lip roll
    m = mouth_curve()
    rad = 0.0085 * np.sin(np.linspace(0.12, np.pi - 0.12, len(m))) ** 0.7 + 0.0018
    g.sub(Prim(tube(m, rad).f, m.min(0) - 0.02, m.max(0) + 0.02), k=0.006)
    lip = bezier((-0.03, -0.108, 1.279), (0.0, -0.124, 1.254), (0.03, -0.108, 1.279), n=7)
    g.add(tube(lip, 0.0028), k=0.006)
    for s in (1, -1):   # mouth corner dimples
        g.add(sphere(V(0.049 * s, -0.096, 1.296), 0.008), k=0.01)
    g.displace(lambda P: 0.0006 * fbm(P, 60, 2, 3))
    return g


def head_paint(P, N):
    col = np.ones((len(P), 3))
    for s in (1, -1):   # rosy cheeks
        d = np.linalg.norm(P - V(0.06 * s, -0.095, 1.31), axis=1)
        w = np.exp(-(d / 0.03) ** 2)[:, None]
        col = col * (1 - w * 0.5) + w * 0.5 * np.array(lin("#f08a7a")) / np.array(lin("#f2c4a2"))
        d = np.linalg.norm(P - V(0.11 * s, 0.005, 1.345), axis=1)               # warm ears
        w = np.exp(-(d / 0.03) ** 2)[:, None] * 0.35
        col = col * (1 - w) + w * np.array([1.05, 0.72, 0.65])
    d = np.linalg.norm(P - V(0, -0.12, 1.33), axis=1)                           # nose tip
    w = np.exp(-(d / 0.016) ** 2)[:, None] * 0.35
    col = col * (1 - w) + w * np.array([1.05, 0.7, 0.62])
    # mouth interior + lips
    m = mouth_curve(40)
    dm = np.min(np.linalg.norm(P[:, None, :] - m[None], axis=2), axis=1)
    inside = (dm < 0.0105) & (P[:, 1] > -0.122)
    col[inside] = np.array([0.22, 0.05, 0.05])
    lipz = np.exp(-(np.clip(dm - 0.008, 0, 1) / 0.006) ** 2)[:, None] * (~inside)[:, None] * 0.35
    col = col * (1 - lipz) + lipz * np.array([0.95, 0.62, 0.58])
    return col


def build_teeth():
    g = Grid((-0.05, -0.13, 1.24), (0.05, -0.08, 1.31), 0.0012)
    m = bezier((-0.037, -0.1, 1.296), (0.0, -0.119, 1.276), (0.037, -0.1, 1.296), n=8)
    for i, p in enumerate(m):
        if i == 5:
            continue          # the gap tooth
        tang = norm(m[min(i + 1, 7)] - m[max(i - 1, 0)])
        R = frame(V(0, 0, 1), V(0, 0, 1))
        R = np.stack([tang, norm(np.cross(V(0, 0, 1), tang)), V(0, 0, 1)], axis=1)
        g.add(box(p + V(0, 0.0035, -0.001), (0.0043, 0.0028, 0.0062), 0.0022, R), k=0.0006)
    return g


def build_brows():
    g = Grid((-0.09, -0.13, 1.37), (0.09, -0.06, 1.43), 0.0015)
    for s in (1, -1):
        pts = bezier((0.016 * s, -0.106, 1.392), (0.04 * s, -0.112, 1.405), (0.072 * s, -0.094, 1.396), n=6)
        g.add(tube(pts, np.linspace(0.0062, 0.0035, 6)), k=0.002)
    return g


# ------------------------------------------------------------------ hair + cap (head space)
CAP_C = V(0, 0.03, 1.412)
CAP_R = V(0.121, 0.128, 0.104)
CAP_TILT = rot_x(-21)                    # pushed back: forehead + bangs show, brim low at the nape
SCALP_C = HEAD_C + V(0, 0.012, 0.035)
SCALP_R = V(0.108, 0.115, 0.11)


def cap_band():
    """Plane separating the cap from the hair below it."""
    n = CAP_TILT @ V(0, 0, 1)
    return CAP_C + n * -0.014, n


def shell_pt(az, el, out=0.0):
    """Point on the hair shell. az=0 -> face (-Y), +az toward the character's left (+X)."""
    d = V(np.sin(az) * np.cos(el), -np.cos(az) * np.cos(el), np.sin(el))
    return SCALP_C + d * (SCALP_R + out), d


def make_lock(rng, az0, el0, length, width, flare, drift, flick):
    n = 8
    pts, nrm = [], []
    for i, t in enumerate(np.linspace(0, 1, n)):
        el = el0 - t * length / 0.11
        az = az0 + drift * t
        p, d = shell_pt(az, el, 0.006 + flare * t * t)
        if i == n - 1:
            p = p + d * flick[0] + V(0, 0, flick[1])
        pts.append(p); nrm.append(d)
    w = width * np.array([1.0, 0.95, 0.9, 0.84, 0.74, 0.6, 0.42, 0.24])
    th = np.maximum(w * 0.45, 0.003)
    return lock(np.array(pts), w, th, nrm, k=0.005)


def build_hair():
    g = Grid((-0.17, -0.19, 1.2), (0.17, 0.2, 1.53), 0.0018)
    rng = np.random.default_rng(11)
    g.add(ellipsoid(SCALP_C, SCALP_R + 0.008))                 # hair mass under the cap
    g.sub(ellipsoid(V(0, -0.135, 1.335), (0.112, 0.085, 0.102)), k=0.012)   # hairline: face stays clear
    pc, n = cap_band()
    locks = []
    # sides + back: chunky locks spilling from under the cap, lying along the head
    for i in range(70):
        az = rng.uniform(0.62, np.pi) * rng.choice([-1, 1])
        side = abs(np.sin(az))
        back = -np.cos(az)      # 1 at the back
        p0, d0 = shell_pt(az, 0.0)
        el0 = np.arcsin(np.clip(((pc - SCALP_C) @ n + 0.01 - (p0 - SCALP_C) @ n) / 0.11, -1, 1)) + rng.uniform(0.05, 0.2)
        length = rng.uniform(0.07, 0.11) * (0.75 + 0.35 * max(back, 0)) * (0.8 if side > 0.85 else 1.0)
        messy = rng.random() < 0.25
        locks.append(make_lock(rng, az, el0, length, rng.uniform(0.032, 0.046),
                               rng.uniform(0.012, 0.024) if messy else rng.uniform(0.002, 0.009),
                               rng.normal(0, 0.1), (rng.uniform(0.0, 0.01), rng.uniform(-0.002, 0.008))))
    # messy flicks curling out over the ears and at the nape
    for i in range(20):
        az = rng.uniform(1.25, 2.7) * rng.choice([-1, 1])
        p0, d0 = shell_pt(az, 0.0)
        el0 = np.arcsin(np.clip(((pc - SCALP_C) @ n + 0.01 - (p0 - SCALP_C) @ n) / 0.11, -1, 1)) + rng.uniform(0.0, 0.12)
        locks.append(make_lock(rng, az, el0, rng.uniform(0.07, 0.095), rng.uniform(0.026, 0.034), rng.uniform(0.03, 0.05),
                               rng.normal(0, 0.15), (rng.uniform(0.015, 0.03), rng.uniform(0.01, 0.022))))
    # bangs: sweep across the forehead from under the pushed-back cap
    for i in range(13):
        az = rng.uniform(-0.75, 0.75)
        el0 = 0.62 + rng.uniform(-0.04, 0.05)
        length = rng.uniform(0.05, 0.075) * (1.0 - 0.25 * abs(az))
        locks.append(make_lock(rng, az, el0, length, rng.uniform(0.036, 0.046), rng.uniform(0.003, 0.012),
                               0.2 + rng.normal(0, 0.08), (rng.uniform(0.002, 0.01), rng.uniform(0.0, 0.006))))
    for L in locks:
        g.add(L, k=0.004)
    # keep the eyes and lower face clear
    for s in (1, -1):
        g.sub(ellipsoid(V(0.045 * s, -0.122, 1.36), (0.042, 0.05, 0.032)), k=0.008)
    g.sub(ellipsoid(V(0, -0.14, 1.29), (0.1, 0.08, 0.075)), k=0.01)
    for s in (1, -1):   # ear lobes peek out
        g.sub(ellipsoid(V(0.112 * s, 0.0, 1.318), (0.03, 0.03, 0.022)), k=0.008)
    g.displace(lambda P: 0.0008 * fbm(P * V(1, 1, 0.35), 55, 2, 11))
    return g


def hair_paint(P, N):
    r = np.linalg.norm((P - SCALP_C) / SCALP_R, axis=1)
    tip = np.clip((r - 1.04) / 0.35, 0, 1)[:, None]
    base = np.array([0.78, 0.66, 0.5])
    light = np.array([1.12, 1.05, 0.92])
    n = fbm(P * V(1, 1, 0.3), 140, 2, 5)[:, None] * 0.14
    return base * (1 - tip) + light * tip + n


def build_cap():
    g = Grid((-0.16, -0.17, 1.26), (0.16, 0.32, 1.56), 0.0017)
    pc, n = cap_band()
    dome = ellipsoid(CAP_C, CAP_R, CAP_TILT)
    g.add(dome, mask=halfspace(pc, -n))
    g.add(torus(pc + n * 0.004, 0.0, 0.0)) if False else None
    # backward brim
    Rb = CAP_TILT @ rot_x(16)
    brim_c = CAP_C + CAP_TILT @ V(0, 0.158, -0.006)
    g.add(ellipsoid(brim_c, (0.094, 0.088, 0.0075), Rb), k=0.006,
          mask=halfspace(CAP_C + CAP_TILT @ V(0, 0.07, 0), CAP_TILT @ V(0, -1, 0)))
    # snapback opening at the front + button on top
    g.sub(ellipsoid(CAP_C + CAP_TILT @ V(0, -0.125, -0.012), (0.034, 0.03, 0.03)), k=0.004)
    g.add(cylinder(CAP_C + CAP_TILT @ V(0, 0, CAP_R[2] - 0.001), 0.0085, 0.004, 0.003, CAP_TILT), k=0.002)
    for a in np.radians([30, 90, 150, 210, 270, 330]):   # panel seams
        pts = [CAP_C + CAP_TILT @ (V(np.sin(a) * np.cos(e), -np.cos(a) * np.cos(e), np.sin(e)) * CAP_R * 1.004)
               for e in np.linspace(0.16, 1.45, 10)]
        g.sub(tube(np.array(pts), 0.0013), k=0.001)
    return g


def build_strap():
    g = Grid((-0.07, -0.18, 1.33), (0.07, -0.02, 1.52), 0.0012)
    p0 = CAP_C + CAP_TILT @ V(-0.034, -0.118, -0.022)
    p1 = CAP_C + CAP_TILT @ V(0.034, -0.118, -0.022)
    g.add(tube(bezier(p0, (p0 + p1) / 2 + CAP_TILT @ V(0, -0.012, 0), p1, n=7), 0.0042))
    return g


# ------------------------------------------------------------------ torso: tee
def build_shirt():
    g = Grid((-0.32, -0.21, 0.62), (0.32, 0.2, 1.17), 0.0028)
    g.add(ellipsoid((0, 0.006, 0.955), (0.178, 0.13, 0.15)))
    g.add(ellipsoid((0, -0.02, 0.81), (0.178, 0.145, 0.135)), k=0.07)
    g.add(ellipsoid((0, 0.0, 0.72), (0.176, 0.137, 0.08)), k=0.04)
    g.add(capsule((-0.12, 0.012, 1.035), (0.12, 0.012, 1.035), 0.06), k=0.08)
    for s in (1, -1):
        S, E, W, d, d2 = arm_pts(s)
        g.add(capsule(S + d * 0.01, S + d * 0.12, 0.065, 0.064), k=0.04)
    g.intersect(halfspace((0, 0, 0.675), (0, 0, -1)))
    # openings: collar, sleeves, hem
    g.sub(capsule((0, 0.012, 1.04), (0, 0.01, 1.22), 0.07), k=0.006)
    for s in (1, -1):
        S, E, W, d, d2 = arm_pts(s)
        g.sub(capsule(S + d * 0.07, S + d * 0.3, 0.056), k=0.004)
    g.sub(ellipsoid((0, -0.006, 0.648), (0.165, 0.126, 0.05)), k=0.004)
    g.add(torus((0, 0.008, 1.09), 0.073, 0.0078, rot_x(-14)), k=0.004)            # ribbed collar
    g.displace(lambda P: 0.0022 * vnoise(P * V(4, 4, 18), 3.0, 4) + 0.001 * fbm(P, 30, 2, 8))
    return g


def shirt_uv(P, N):
    return np.stack([P[:, 0], P[:, 2]], axis=1), None


PRINT_BOX = (-0.14, 0.14, 0.75, 1.03)    # x0, x1, z0, z1 of the chest print


def build_print(shirt_obj):
    """Decal: copy of the shirt's chest faces, nudged outward. The skull print lives in its texture."""
    import rigkit as rk
    P, T, N = rk.mesh_arrays(shirt_obj)
    x0, x1, z0, z1 = PRINT_BOX
    keep = (N[:, 1] < -0.2) & (P[:, 0] > x0) & (P[:, 0] < x1) & (P[:, 2] > z0) & (P[:, 2] < z1)
    tk = keep[T].all(1)
    used = np.unique(T[tk])
    remap = -np.ones(len(P), int); remap[used] = np.arange(len(used))
    return P[used] + N[used] * 0.0008, remap[T[tk]]


# ------------------------------------------------------------------ arms + hands (skin)
def build_arm(s):
    def f():
        S, E, W, d, d2 = arm_pts(s)
        g = Grid(np.minimum(S, W) - 0.18, np.maximum(S, W) + 0.18, 0.0017)
        g.add(capsule(S + d * 0.05, S + d * 0.13, 0.04, 0.05), k=0.0)        # slimmer where the sleeve hides it
        g.add(capsule(S + d * 0.13, E, 0.052, 0.045), k=0.02)
        g.add(capsule(E, E + d2 * 0.07, 0.045, 0.049), k=0.018)               # forearm bulge
        g.add(capsule(E + d2 * 0.07, W, 0.049, 0.035), k=0.022)
        Wp, R = hand_frame(s)
        hands.sculpt(g, Wp, R, HAND)
        g.displace(lambda P: 0.0004 * fbm(P, 80, 2, 2))
        return g
    return f


def arm_paint(s):
    def f(P, N):
        Wp, R = hand_frame(s)
        loc = (P - Wp) @ R
        col = np.ones((len(P), 3))
        tip = np.clip((-loc[:, 2] - 0.11) / 0.07, 0, 1)
        col *= (1 - 0.14 * tip)[:, None] * np.array([1.0, 0.93, 0.9]) + (0.14 * tip)[:, None]
        palm = np.clip(loc[:, 0] / 0.02, 0, 1) * (loc[:, 2] < -0.01)
        col = col * (1 - 0.1 * palm)[:, None] + (0.1 * palm)[:, None] * np.array([1.08, 0.95, 0.9])
        return col
    return f


def build_band(s):
    def f():
        S, E, W, d, d2 = arm_pts(s)
        g = Grid(W - 0.08, W + 0.08, 0.0012)
        c, R = W - d2 * 0.03, frame(d2)
        g.add(cylinder(c, 0.042, 0.017, 0.004, R))
        g.sub(cylinder(c, 0.034, 0.03, 0.0, R))
        return g
    return f


def build_studs(s):
    def f():
        S, E, W, d, d2 = arm_pts(s)
        g = Grid(W - 0.08, W + 0.08, 0.0009)
        c, R = W - d2 * 0.03, frame(d2)
        for a in np.linspace(0, 2 * np.pi, 10)[:-1]:
            p = c + R @ V(np.cos(a) * 0.042, np.sin(a) * 0.042, 0)
            g.add(capsule(p, c + R @ V(np.cos(a) * 0.052, np.sin(a) * 0.052, 0), 0.0055, 0.0012))
        return g
    return f


# ------------------------------------------------------------------ pants
def build_pants():
    g = Grid((-0.28, -0.2, 0.04), (0.28, 0.2, 0.83), 0.0028)
    g.add(ellipsoid((0, 0.008, 0.715), (0.18, 0.138, 0.12)))
    for s in (1, -1):
        H, K, A, B, T = leg_pts(s)
        g.add(capsule(H + V(0, 0, 0.02), K, 0.1, 0.086), k=0.05)
        g.add(capsule(K, A + V(0, -0.004, 0.03), 0.086, 0.08), k=0.02)
        g.add(ellipsoid(V(A[0], -0.004, 0.13), (0.084, 0.086, 0.05)), k=0.03)   # bunching on the shoe
        g.add(box(V(0.184 * s, -0.004, 0.49), (0.017, 0.066, 0.075), 0.012), k=0.006)   # cargo pocket
        g.add(box(V(0.192 * s, -0.004, 0.56), (0.012, 0.07, 0.022), 0.008), k=0.003)
        g.add(box(V(0.084 * s, 0.136, 0.715), (0.06, 0.009, 0.06), 0.008), k=0.004)
    g.intersect(halfspace((0, 0, 0.82), (0, 0, 1)))
    g.intersect(halfspace((0, 0, 0.088), (0, 0, -1)))
    for s in (1, -1):
        H, K, A, B, T = leg_pts(s)
        g.sub(capsule(A + V(0, 0, -0.05), A + V(0, 0, 0.04), 0.064), k=0.004)
    # creases: bunching rings near the cuffs, soft folds elsewhere
    def folds(P):
        cuff = np.exp(-((P[:, 2] - 0.15) / 0.06) ** 2)
        return (0.004 * cuff * np.sin(P[:, 2] * 170 + 9 * vnoise(P, 14, 3) + 3 * np.arctan2(P[:, 1], P[:, 0] - np.sign(P[:, 0]) * 0.097)) +
                0.0022 * vnoise(P * V(3, 3, 12), 3.0, 21) + 0.0012 * fbm(P, 25, 2, 9))
    g.displace(folds)
    return g


# ------------------------------------------------------------------ high-top sneakers
def shoe_parts(s):
    H, K, A, B, T = leg_pts(s)
    x = A[0]
    foot = V(x + 0.004 * s, -0.062, 0.0)

    def upper():
        g = Grid((x - 0.1, -0.25, -0.01), (x + 0.1, 0.13, 0.23), 0.0018)
        g.add(ellipsoid(foot + V(0, 0, 0.062), (0.064, 0.138, 0.058)))
        g.add(cylinder(V(x, 0.016, 0.125), 0.063, 0.07, 0.03), k=0.035)
        g.add(capsule(V(x, -0.07, 0.1), V(x, -0.005, 0.185), 0.03), k=0.02)   # tongue
        g.intersect(halfspace(V(0, 0, 0.028), V(0, 0, -1)))
        g.sub(capsule(V(x, 0.018, 0.16), V(x, 0.018, 0.3), 0.046), k=0.006)   # ankle opening
        return g

    def sole():
        g = Grid((x - 0.1, -0.26, -0.01), (x + 0.1, 0.13, 0.1), 0.0016)
        g.add(ellipsoid(foot + V(0, 0, 0.02), (0.068, 0.148, 0.06)))
        g.intersect(halfspace(V(0, 0, 0.036), V(0, 0, 1)), k=0.006)
        g.intersect(halfspace(V(0, 0, 0.0), V(0, 0, -1)), k=0.004)
        g.add(ellipsoid(foot + V(0, -0.105, 0.042), (0.058, 0.052, 0.034)), k=0.008)   # rubber toe cap
        g.sub(torus(foot + V(0, 0, 0.02), 0.0, 0.0)) if False else None
        return g

    def laces():
        g = Grid((x - 0.06, -0.17, 0.05), (x + 0.06, 0.04, 0.2), 0.0011)
        for i, y in enumerate(np.linspace(-0.118, -0.01, 5)):
            z = 0.104 + (y + 0.118) * 0.5
            g.add(capsule(V(x - 0.026, y - 0.008, z), V(x + 0.026, y + 0.008, z), 0.0034))
            g.add(capsule(V(x - 0.026, y + 0.008, z), V(x + 0.026, y - 0.008, z), 0.0034))
        return g

    def patch():
        g = Grid((x - 0.11, -0.04, 0.06), (x + 0.11, 0.08, 0.2), 0.0011)
        g.add(cylinder(V(x + 0.064 * s, 0.022, 0.13), 0.021, 0.003, 0.002, rot_y(90)))
        return g

    return upper, sole, laces, patch


def build(out, preview_dir=None):
    import bpy
    import charkit as ck
    import rigkit as rk

    SKIN = ("M_Skin", lin("#f2c4a2"), 0.5, 0.0)
    feet = lambda s: ["LeftFoot", "LeftToe", "LeftShin"] if s > 0 else ["RightFoot", "RightToe", "RightShin"]
    parts = [
        Part("Head", placed(build_head), SKIN, bones=["Head", "Neck", "Chest"], paint=lambda P, N: head_paint(OLD_C + (P - HEAD_AT) / HS, N),
             dec=26000, bias={"Head": 1.6}, power=5),
        Part("Teeth", placed(build_teeth), ("M_Teeth", lin("#f4efe2"), 0.25, 0.0), rigid="Head", dec=1500, ao=0.6),
        Part("Brows", placed(build_brows), ("M_Brow", lin("#b07a2a"), 0.7, 0.0), rigid="Head", dec=1200),
        Part("Hair", placed(build_hair), ("M_Hair", lin("#e8b24a"), 0.55, 0.0), rigid="Head",
             paint=lambda P, N: hair_paint(OLD_C + (P - HEAD_AT) / HS, N), dec=26000),
        Part("Cap", placed(build_cap), ("M_Cap", lin("#1d1d20"), 0.75, 0.0), rigid="Head", dec=9000),
        Part("CapStrap", placed(build_strap), ("M_CapStrap", lin("#b5241f"), 0.6, 0.0), rigid="Head", dec=800),
        Part("Shirt", build_shirt, ("M_Shirt", lin("#1b1a1c"), 0.9, 0.0),
             bones=["Body", "Spine", "Chest", "Neck", "LeftShoulder", "LeftArm", "RightShoulder", "RightArm"],
             uv=shirt_uv, dec=16000, power=4, smooth=10, bias={"Spine": 1.3, "Chest": 1.3}),
        Part("Pants", build_pants, ("M_Pants", lin("#6d6a45"), 0.92, 0.0),
             bones=["Body", "Spine", "LeftLeg", "LeftShin", "RightLeg", "RightShin"], dec=18000, power=4, smooth=10),
    ]
    for s, nm in ((1, "Left"), (-1, "Right")):
        fingers = [f"{nm}{f}{i}" for f in ("Thumb", "Index", "Middle", "Ring", "Pinky") for i in (1, 2, 3)]
        parts.append(Part(f"Arm{nm[0]}", build_arm(s), SKIN, bones=[f"{nm}Shoulder", f"{nm}Arm", f"{nm}ForeArm", f"{nm}Hand"] + fingers,
                          paint=arm_paint(s), dec=14000, power=7, smooth=3))
        up, so, la, pa = shoe_parts(s)
        parts.append(Part(f"Shoe{nm[0]}", up, ("M_ShoeCanvas", lin("#222226"), 0.85, 0.0), bones=feet(s), dec=6000, power=5))
        parts.append(Part(f"Sole{nm[0]}", so, ("M_ShoeRubber", lin("#efe9dc"), 0.6, 0.0), bones=feet(s)[:2], dec=5000, power=5))
        parts.append(Part(f"Laces{nm[0]}", la, ("M_Lace", lin("#f1eee6"), 0.8, 0.0), rigid=f"{nm}Foot", dec=2500))
        parts.append(Part(f"Patch{nm[0]}", pa, ("M_ShoeRubber", lin("#efe9dc"), 0.6, 0.0), rigid=f"{nm}Foot", dec=400))
    parts.append(Part("Band", build_band(1), ("M_Band", lin("#18171a"), 0.55, 0.0), rigid="LeftForeArm", dec=2500))
    parts.append(Part("Studs", build_studs(1), ("M_Metal", lin("#c9c6c0"), 0.3, 1.0), rigid="LeftForeArm", dec=3000, ao=0.4))

    empties = [dict(name=f"Eye{'L' if s > 0 else 'R'}", pos=hp(EYE[s]), bone="Head",
                    props=dict(rx=0.0265 * HS, ry=0.0295 * HS, rz=0.02 * HS, iris="#5b8fc7", lid="#f2c4a2")) for s in (1, -1)]
    empties.append(dict(name="GuitarMount", pos=(0, 0.14, 0.92), bone="Chest"))
    for s, nm in ((1, "Left"), (-1, "Right")):
        Wp, R = hand_frame(s)
        empties.append(dict(name=f"{nm}Grip", pos=Wp + R @ V(0.03, 0, -0.075), bone=f"{nm}Hand"))

    def post_print(parts_by_name):
        v, f = build_print(parts_by_name["Shirt"].obj)
        ob = rk.new_mesh("ShirtPrint", v, f, rk.material("M_ShirtPrint", lin("#ffffff"), 0.8, 0.0, use_vcol=False))
        P, T, N = rk.mesh_arrays(ob)
        x0, x1, z0, z1 = PRINT_BOX
        rk.set_uv(ob, np.stack([(P[:, 0] - x0) / (x1 - x0), (P[:, 2] - z0) / (z1 - z0)], axis=1))
        bone_seg = {b["name"]: (V(b["head"]), V(b["tail"])) for b in bones()}
        w = rk.auto_weights(P, T, bone_seg, ["Body", "Spine", "Chest", "Neck", "LeftShoulder", "RightShoulder"], 4, 10, 0.5,
                            {"Spine": 1.3, "Chest": 1.3})
        rk.skin(ob, bpy.data.objects["Rig"], w)

    ao_obj = ck.build_character("bully", bones(), parts, out, empties, shape_keys=post_print,
                                extras=dict(character="bully", height=1.5))
    if preview_dir:
        rk.preview(f"{preview_dir}/bully", target=(0, 0, 0.76), dist=3.5, views=((0, 6), (38, 6), (90, 4), (180, 6)))
        rk.preview(f"{preview_dir}/bully_face", target=hp((0, -0.02, 1.37)), dist=1.0, views=((0, 4), (32, 6), (75, 2)), res=(560, 560))
    return ao_obj
