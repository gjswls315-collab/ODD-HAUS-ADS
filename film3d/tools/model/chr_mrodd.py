"""Mr. ODD - 1.80 m, heavy-set: wide jowly face, huge walrus moustache, heavy angry brows,
curly dark hair going grey at the temples, red plaid robe with darker shawl collar over a white
shirt, rope belt with tassels, striped pyjama trousers, sheepskin slippers.
Blender coordinates (Z up, faces -Y, left = +X)."""
import numpy as np
from sdf import (Grid, V, norm, sphere, ellipsoid, capsule, box, cylinder, torus, tube, bezier, lock,
                 halfspace, frame, euler, rot_x, rot_y, rot_z, fbm, vnoise, Prim, Union)
from charkit import Part, lin
import hands

HC = V(0, -0.005, 1.63)          # head centre
S_Z = 1.40
ABD = 24.0
HAND = dict(scale=1.3, palm=(0.019, 0.044, 0.043), chub=1.12)


def arm_pts(s):
    S = V(0.25 * s, 0.02, S_Z)
    d = norm(V(np.sin(np.radians(ABD)) * s, -0.05, -np.cos(np.radians(ABD))))
    E = S + d * 0.3
    d2 = norm(d + V(0, -0.14, 0.02))
    W = E + d2 * 0.27
    return S, E, W, d, d2


def leg_pts(s):
    H = V(0.12 * s, 0.01, 0.88)
    K = V(0.125 * s, -0.01, 0.48)
    A = V(0.13 * s, 0.01, 0.085)
    B = V(0.13 * s, -0.12, 0.025)
    T = V(0.13 * s, -0.2, 0.025)
    return H, K, A, B, T


def hand_frame(s):
    S, E, W, d, d2 = arm_pts(s)
    f = d2
    medial = V(-s, 0, 0)
    pn = norm(medial - f * (medial @ f))
    t = norm(np.cross(f, pn) * s)
    if t[1] > 0:
        t = -t
    return W, np.stack([pn, t, -f], axis=1)


def bones():
    B = [
        dict(name="Body", head=(0, 0.01, 0.9), tail=(0, 0.01, 1.0)),
        dict(name="Spine", head=(0, 0.01, 1.0), tail=(0, 0.01, 1.14), parent="Body"),
        dict(name="Chest", head=(0, 0.01, 1.14), tail=(0, 0.015, 1.4), parent="Spine"),
        dict(name="Neck", head=(0, 0.015, 1.42), tail=(0, 0.01, 1.53), parent="Chest"),
        dict(name="Head", head=(0, 0.01, 1.53), tail=(0, 0.01, 1.8), parent="Neck"),
    ]
    for s, nm in ((1, "Left"), (-1, "Right")):
        S, E, W, d, d2 = arm_pts(s)
        B.append(dict(name=f"{nm}Shoulder", head=(0.05 * s, 0.02, 1.37), tail=tuple(S), parent="Chest"))
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


# ------------------------------------------------------------------ head
EYE = {s: V(0.046 * s, -0.099, 1.637) for s in (1, -1)}


def build_head():
    g = Grid((-0.17, -0.2, 1.33), (0.17, 0.17, 1.8), 0.002)
    c = HC
    g.add(ellipsoid(c + V(0, 0.022, 0.05), (0.122, 0.13, 0.13)))
    g.add(ellipsoid(c + V(0, -0.03, -0.045), (0.128, 0.115, 0.112)), k=0.05)
    for s in (1, -1):
        g.add(sphere(V(0.085 * s, -0.055, 1.555), 0.07), k=0.05)               # jowls
        g.add(sphere(V(0.06 * s, -0.095, 1.6), 0.04), k=0.03)                  # cheek pads
    g.add(sphere(V(0, -0.085, 1.505), 0.05), k=0.04)                           # chin
    g.add(ellipsoid(V(0, -0.035, 1.478), (0.1, 0.085, 0.05)), k=0.04)          # double chin
    g.add(capsule((0, 0.03, 1.33), (0, 0.015, 1.52), 0.088), k=0.08)           # neck
    g.add(ellipsoid((0, 0.075, 1.53), (0.095, 0.07, 0.085)), k=0.05)              # nape
    g.add(capsule((-0.078, -0.103, 1.676), (0.078, -0.103, 1.676), 0.021), k=0.028)   # brow ridge
    g.add(capsule((0, -0.112, 1.665), (0, -0.147, 1.6), 0.016, 0.031), k=0.02)  # big nose
    for s in (1, -1):
        g.add(sphere(V(0.024 * s, -0.132, 1.592), 0.018), k=0.012)
        g.sub(sphere(V(0.016 * s, -0.149, 1.583), 0.0075), k=0.004)
    for s in (1, -1):
        g.sub(ellipsoid(EYE[s] + V(0, -0.006, 0.0), (0.028, 0.02, 0.023)), k=0.012)
        g.add(sphere(V(0.05 * s, -0.112, 1.612), 0.014), k=0.012)              # bags under the eyes
        R = euler(0, -14 * s, -8 * s)
        g.add(ellipsoid(V(0.122 * s, 0.004, 1.622), (0.019, 0.031, 0.046), R), k=0.014)
        g.sub(ellipsoid(V(0.135 * s, 0.0, 1.62), (0.008, 0.02, 0.03), R), k=0.005)
    frown = bezier((-0.036, -0.122, 1.536), (0.0, -0.136, 1.552), (0.036, -0.122, 1.536), n=7)
    g.sub(tube(frown, 0.0032), k=0.004)
    g.add(tube(bezier((-0.026, -0.127, 1.527), (0.0, -0.139, 1.534), (0.026, -0.127, 1.527), n=7), 0.0075), k=0.008)
    g.displace(lambda P: 0.0008 * fbm(P, 55, 2, 3))
    return g


def head_paint(P, N):
    col = np.ones((len(P), 3))
    d = np.linalg.norm(P - V(0, -0.15, 1.6), axis=1)                           # ruddy nose
    w = np.exp(-(d / 0.03) ** 2)[:, None] * 0.45
    col = col * (1 - w) + w * np.array([1.05, 0.66, 0.6])
    for s in (1, -1):
        d = np.linalg.norm(P - V(0.07 * s, -0.11, 1.585), axis=1)              # flushed cheeks
        w = np.exp(-(d / 0.035) ** 2)[:, None] * 0.3
        col = col * (1 - w) + w * np.array([1.05, 0.72, 0.66])
    # five-o'clock shadow on the jaw
    jaw = np.clip((1.585 - P[:, 2]) / 0.03, 0, 1) * np.clip((-P[:, 1] - 0.02) / 0.04, 0, 1)
    jaw *= np.clip((P[:, 2] - 1.44) / 0.03, 0, 1)
    speck = 0.8 + 0.2 * vnoise(P, 900, 4)
    w = (jaw * 0.32 * speck)[:, None]
    col = col * (1 - w) + w * np.array([0.55, 0.55, 0.6])
    return col


def build_moustache():
    g = Grid((-0.16, -0.21, 1.45), (0.16, -0.06, 1.63), 0.0013)
    rng = np.random.default_rng(3)
    g.add(ellipsoid(V(0, -0.142, 1.568), (0.05, 0.018, 0.016)), k=0.0)          # mass under the nose
    for s in (1, -1):
        for i in range(22):
            u = rng.uniform(0, 1)
            root = V(s * u * 0.035, -0.146 + u * 0.006, 1.58 - u * 0.006 + rng.uniform(-0.006, 0.004))
            mid = V(s * (0.05 + 0.032 * u), -0.146 + 0.014 * u, 1.566 - 0.012 * u)
            tip = V(s * (0.074 + 0.03 * u + rng.uniform(0, 0.012)), -0.122 + 0.02 * u, 1.508 - 0.028 * u + rng.uniform(-0.01, 0.006))
            pts = bezier(root, mid, tip, n=8)
            w = rng.uniform(0.028, 0.036) * np.array([1.0, 1.05, 1.05, 1.0, 0.92, 0.78, 0.56, 0.3])
            nrm = [norm(V(s * 0.25, -1.0, 0.2))] * 8
            g.add(lock(pts, w, np.maximum(w * 0.62, 0.004), nrm, k=0.004), k=0.005)
    g.sub(ellipsoid(V(0, -0.105, 1.6), (0.06, 0.03, 0.03)), k=0.005)            # keep it off the nostrils' inside
    g.displace(lambda P: 0.0007 * fbm(P * V(0.5, 1, 1), 140, 2, 7))
    return g


def build_brows():
    g = Grid((-0.12, -0.15, 1.64), (0.12, -0.07, 1.73), 0.0012)
    rng = np.random.default_rng(5)
    for s in (1, -1):
        for i in range(12):
            o = rng.normal(0, 0.004, 3)
            root = V(s * 0.016, -0.122, 1.668) + o
            tip = V(s * (0.09 + rng.uniform(0, 0.012)), -0.1, 1.706 + rng.uniform(-0.006, 0.008)) + o
            mid = (root + tip) / 2 + V(0, -0.012, 0.008)
            pts = bezier(root, mid, tip, n=7)
            w = rng.uniform(0.018, 0.024) * np.array([0.9, 1.0, 1.0, 0.95, 0.8, 0.6, 0.35])
            g.add(lock(pts, w, np.maximum(w * 0.7, 0.004), [V(0, -1, 0.3)] * 7, k=0.003), k=0.004)
    return g


SCALP_C = HC + V(0, 0.022, 0.05)
SCALP_R = V(0.124, 0.132, 0.132)


def build_hair():
    g = Grid((-0.19, -0.18, 1.52), (0.19, 0.2, 1.86), 0.0018)
    rng = np.random.default_rng(9)
    base = ellipsoid(SCALP_C, SCALP_R + 0.012)
    g.add(base)
    g.sub(ellipsoid(V(0, -0.15, 1.62), (0.135, 0.09, 0.105)), k=0.015)         # hairline / face
    for s in (1, -1):
        g.sub(ellipsoid(V(0.13 * s, -0.02, 1.6), (0.05, 0.06, 0.06)), k=0.012)  # ears + sideburn cut
    g.sub(halfspace(V(0, 0, 1.6), norm(V(0, 0.42, -1))), k=0.02)              # stop above the ears, lower at the nape
    curls = []
    n = 0
    while n < 260:
        d = norm(rng.normal(0, 1, 3))
        if d[2] < -0.05 or (d[1] < -0.55 and d[2] < 0.55):
            continue
        p = SCALP_C + d * (SCALP_R + 0.016)
        if p[2] < 1.6 - 0.42 * max(p[1], 0) or (p[1] < -0.08 and p[2] < 1.72):
            continue
        Rr = frame(norm(d + rng.normal(0, 0.6, 3)))
        Rc = rng.uniform(0.01, 0.015)
        curls.append(torus(p, Rc, rng.uniform(0.0085, 0.011), Rr))
        n += 1
    for cu in curls:
        g.add(cu, k=0.003)
    g.displace(lambda P: 0.0009 * fbm(P, 80, 2, 13))
    return g


def hair_paint(P, N):
    side = np.clip((np.abs(P[:, 0]) - 0.07) / 0.05, 0, 1) * np.clip((1.72 - P[:, 2]) / 0.06, 0, 1)
    grey = np.clip(side + 0.35 * (vnoise(P, 60, 2) > 0.45), 0, 1)[:, None]
    dark = np.array([1.0, 1.0, 1.0])
    g = np.array([5.5, 5.4, 5.3])            # multiplies the near-black base -> salt-and-pepper
    return dark * (1 - grey) + g * grey


# ------------------------------------------------------------------ robe + shirt
def robe_torso(g, inflate=0.0):
    g.add(ellipsoid((0, 0.01, 1.25), V(0.255, 0.175, 0.2) + inflate))
    g.add(ellipsoid((0, -0.05, 1.04), V(0.262, 0.235, 0.215) + inflate), k=0.09)
    g.add(capsule((-0.2, 0.02, 1.37), (0.2, 0.02, 1.37), 0.085 + inflate), k=0.08)
    g.add(ellipsoid((0, 0.0, 0.86), V(0.26, 0.2, 0.15) + inflate), k=0.08)


V_TOP, V_BOTTOM = 1.43, 1.13


def v_wedge():
    """Prism removing the robe's V-neck: apex at the belt line, opening to the shoulders."""
    def f(P):
        z = P[..., 2]
        t = np.clip((z - V_BOTTOM) / (V_TOP - V_BOTTOM), 0, 1.2)
        half = 0.012 + 0.11 * t
        dx = np.abs(P[..., 0]) - half
        dz = V_BOTTOM - z
        dy = P[..., 1] + 0.02            # only the front half
        return np.maximum(np.maximum(dx, dz), dy)
    return Prim(f, V(-0.2, -0.4, V_BOTTOM - 0.02), V(0.2, 0.0, 1.6))


def build_robe():
    g = Grid((-0.42, -0.34, 0.33), (0.42, 0.3, 1.52), 0.0032)
    robe_torso(g)
    g.add(capsule((0, -0.01, 0.98), (0, 0.0, 0.42), 0.268, 0.29), k=0.08)        # skirt
    for s in (1, -1):
        S, E, W, d, d2 = arm_pts(s)
        g.add(capsule(S - d * 0.03, E + d2 * 0.15, 0.092, 0.084), k=0.06)          # wide sleeves
    g.intersect(halfspace((0, 0, 0.4), (0, 0, -1)))
    g.sub(capsule((0, 0, 0.3), (0, 0, 0.9), 0.24), k=0.01)                         # hollow hem
    for s in (1, -1):
        S, E, W, d, d2 = arm_pts(s)
        g.sub(capsule(E + d2 * 0.08, E + d2 * 0.4, 0.07), k=0.006)                 # sleeve opening
    g.sub(v_wedge(), k=0.01)
    g.sub(capsule((0, 0.03, 1.36), (0, 0.02, 1.6), 0.105), k=0.01)                 # neck hole
    # front overlap edge running down from the belt
    g.add(capsule((0.035, -0.29, 0.98), (0.06, -0.3, 0.42), 0.012), k=0.02)
    def folds(P):
        skirt = np.clip((0.98 - P[:, 2]) / 0.2, 0, 1)
        ang = np.arctan2(P[:, 1], P[:, 0])
        return (0.006 * skirt * np.sin(ang * 9 + 2 * vnoise(P, 6, 2)) + 0.0025 * vnoise(P * V(3, 3, 9), 3.0, 4)
                + 0.0012 * fbm(P, 22, 2, 8))
    g.displace(folds)
    return g


def robe_uv(P, N):
    """Cylindrical UV in metres around the body; sleeves around their own axis."""
    u = np.arctan2(P[:, 0], -P[:, 1]) * 0.27
    v = P[:, 2].copy()
    for s in (1, -1):
        S, E, W, d, d2 = arm_pts(s)
        rel = P - S
        along = rel @ d
        sel = (P[:, 0] * s > 0.26) & (along > 0.03)
        perp = rel - along[:, None] * d
        ax = norm(np.cross(d, V(0, -1, 0)))
        ay = np.cross(d, ax)
        ang = np.arctan2(perp @ ax, perp @ ay)
        u[sel] = ang[sel] * 0.09 + 3.0 * s
        v[sel] = along[sel]
    return np.stack([u, v], axis=1), 0.27 * 2 * np.pi


def build_collar():
    """Darker shawl collar following the V and around the back of the neck."""
    g = Grid((-0.3, -0.34, 1.0), (0.3, 0.22, 1.56), 0.0024)
    for s in (1, -1):
        ctrl = [V(0.0, 0.135, 1.445), V(0.105 * s, 0.1, 1.45), V(0.135 * s, -0.02, 1.44), V(0.122 * s, -0.12, 1.405),
                V(0.095 * s, -0.2, 1.33), V(0.06 * s, -0.25, 1.22), V(0.03 * s, -0.275, 1.12), V(0.0, -0.288, 1.04)]
        from scipy.interpolate import CubicSpline
        tt = np.linspace(0, 1, len(ctrl))
        cs = CubicSpline(tt, np.array(ctrl))
        pts = cs(np.linspace(0, 1, 28))
        widths = np.full(len(pts), 0.042)
        nrm = [norm(V(p[0], p[1] - 0.01, 0.0)) for p in pts]
        g.add(lock(pts, widths, np.full(len(pts), 0.0135), nrm, k=0.008), k=0.012)
    return g


def build_cuffs():
    g = Grid((-0.55, -0.3, 0.75), (0.55, 0.2, 1.3), 0.0024)
    for s in (1, -1):
        S, E, W, d, d2 = arm_pts(s)
        c = E + d2 * 0.135
        g.add(torus(c, 0.08, 0.019, frame(d2)))
    return g


def build_shirt():
    g = Grid((-0.2, -0.3, 1.08), (0.2, 0.15, 1.56), 0.002)
    robe_torso(g, inflate=-0.006)
    g.intersect(halfspace((0, 0, 1.47), (0, 0, 1)))
    g.sub(capsule((0, 0.03, 1.36), (0, 0.02, 1.6), 0.088), k=0.006)
    # collar points
    for s in (1, -1):
        p0 = V(0.03 * s, -0.115, 1.455)
        g.add(lock(bezier(V(0.09 * s, -0.06, 1.47), V(0.075 * s, -0.12, 1.445), V(0.03 * s, -0.15, 1.39), n=6),
                   np.array([0.022, 0.024, 0.024, 0.02, 0.014, 0.006]), np.full(6, 0.004), [V(0, -1, 0.4)] * 6, k=0.002), k=0.004)
    # buttons placket
    g.add(box((0, -0.235, 1.2), (0.008, 0.012, 0.14), 0.004), k=0.006)
    return g


def build_belt():
    g = Grid((-0.34, -0.36, 0.55), (0.34, 0.3, 1.1), 0.0018)
    a = np.linspace(0, 2 * np.pi, 49)
    rx, ry = 0.268, 0.244
    ring = np.stack([rx * np.sin(a), -0.05 - ry * np.cos(a) + 0.0, 1.0 + 0.012 * np.cos(a)], axis=1)
    ring[:, 1] = np.where(ring[:, 1] > 0.0, ring[:, 1] * 0.82, ring[:, 1])
    g.add(tube(ring, 0.0125))
    knot = V(-0.07, -0.285, 0.995)
    g.add(sphere(knot, 0.024), k=0.008)
    g.add(ellipsoid(knot + V(0.0, -0.008, 0.0), (0.03, 0.016, 0.02), rot_z(30)), k=0.008)
    for i, (dx, L) in enumerate(((-0.02, 0.27), (0.015, 0.22))):
        pts = bezier(knot, knot + V(dx * 1.5, -0.03, -L * 0.45), knot + V(dx * 2.5, -0.012, -L), n=9)
        g.add(tube(pts, 0.011), k=0.004)
        g.add(capsule(pts[-1], pts[-1] + V(0, 0, -0.06), 0.016, 0.02), k=0.004)   # tassel
    g.displace(lambda P: 0.0015 * np.sin(np.arctan2(P[:, 1] + 0.05, P[:, 0]) * 80 + P[:, 2] * 400))
    return g


# ------------------------------------------------------------------ legs, slippers
def build_pj(s):
    def f():
        H, K, A, B, T = leg_pts(s)
        g = Grid(np.minimum(H, A) - 0.12, np.maximum(H, A) + 0.12, 0.0026)
        g.add(capsule(H + V(0, 0, -0.1), K, 0.088, 0.078))
        g.add(capsule(K, A + V(0, 0, 0.03), 0.078, 0.068), k=0.02)
        g.intersect(halfspace(A + V(0, 0, 0.0), V(0, 0, -1)))
        g.sub(capsule(A + V(0, 0, -0.06), A + V(0, 0, 0.03), 0.055), k=0.004)
        g.displace(lambda P: 0.003 * vnoise(P * V(3, 3, 10), 3.0, 21) + 0.001 * fbm(P, 25, 2, 9))
        return g
    return f


def pj_uv(P, N):
    return np.stack([np.arctan2(P[:, 0] - np.sign(P[:, 0]) * 0.13, -P[:, 1]) * 0.08, P[:, 2]], axis=1), 0.08 * 2 * np.pi


def build_ankle(s):
    def f():
        H, K, A, B, T = leg_pts(s)
        g = Grid(A - 0.1, A + 0.12, 0.0022)
        g.add(capsule(A + V(0, 0, -0.03), A + V(0, 0, 0.09), 0.045, 0.05))
        return g
    return f


def slipper(s):
    H, K, A, B, T = leg_pts(s)
    x = A[0]
    foot = V(x + 0.004 * s, -0.06, 0.0)

    def body():
        g = Grid((x - 0.11, -0.27, -0.01), (x + 0.11, 0.13, 0.15), 0.0018)
        g.add(ellipsoid(foot + V(0, 0, 0.045), (0.072, 0.15, 0.056)))
        g.intersect(halfspace(V(0, 0, 0.012), V(0, 0, -1)), k=0.008)
        g.sub(capsule(V(x, 0.02, 0.1), V(x, 0.02, 0.2), 0.05), k=0.008)
        g.add(capsule(V(x - 0.04, -0.13, 0.085), V(x + 0.04, -0.13, 0.085), 0.006), k=0.004)   # seam
        return g

    def sole():
        g = Grid((x - 0.11, -0.27, -0.01), (x + 0.11, 0.13, 0.05), 0.0018)
        g.add(ellipsoid(foot + V(0, 0, 0.012), (0.075, 0.155, 0.04)))
        g.intersect(halfspace(V(0, 0, 0.016), V(0, 0, 1)), k=0.004)
        g.intersect(halfspace(V(0, 0, 0.0), V(0, 0, -1)), k=0.003)
        return g

    def fleece():
        g = Grid((x - 0.11, -0.12, 0.04), (x + 0.11, 0.13, 0.16), 0.0016)
        rng = np.random.default_rng(int(4 + s))
        c = V(x, 0.015, 0.098)
        g.add(torus(c, 0.054, 0.014, rot_x(-8)))
        for a in np.linspace(0, 2 * np.pi, 22)[:-1]:
            p = c + rot_x(-8) @ V(np.cos(a) * 0.056, np.sin(a) * 0.056, 0.008)
            g.add(sphere(p + rng.normal(0, 0.002, 3), 0.011), k=0.004)
        return g

    return body, sole, fleece


# ------------------------------------------------------------------ arms
def build_arm(s):
    def f():
        S, E, W, d, d2 = arm_pts(s)
        g = Grid(np.minimum(S, W) - 0.22, np.maximum(S, W) + 0.22, 0.0019)
        g.add(capsule(E + d2 * 0.02, E + d2 * 0.1, 0.06, 0.062))
        g.add(capsule(E + d2 * 0.1, W, 0.062, 0.042), k=0.025)
        Wp, R = hand_frame(s)
        hands.sculpt(g, Wp, R, HAND)
        g.intersect(halfspace(E + d2 * 0.02, -d2))
        g.displace(lambda P: 0.0005 * fbm(P, 70, 2, 2))
        return g
    return f


def arm_paint(s):
    def f(P, N):
        Wp, R = hand_frame(s)
        loc = (P - Wp) @ R
        col = np.ones((len(P), 3))
        tip = np.clip((-loc[:, 2] - 0.12) / 0.08, 0, 1)
        col *= (1 - 0.15 * tip)[:, None] * np.array([1.0, 0.92, 0.88]) + (0.15 * tip)[:, None]
        return col
    return f


def build(out, preview_dir=None):
    import bpy
    import charkit as ck
    import rigkit as rk
    SKIN = ("M_Skin", lin("#e8b598"), 0.5, 0.0)
    feet = lambda s, nm: [f"{nm}Foot", f"{nm}Toe", f"{nm}Shin"]
    torso_b = ["Body", "Spine", "Chest", "Neck", "LeftShoulder", "LeftArm", "RightShoulder", "RightArm", "LeftLeg", "RightLeg"]
    parts = [
        Part("Head", build_head, SKIN, bones=["Head", "Neck", "Chest"], paint=head_paint, dec=26000, bias={"Head": 1.6}, power=5),
        Part("Moustache", build_moustache, ("M_Moustache", lin("#1c1716"), 0.6, 0.0), rigid="Head", dec=9000),
        Part("Brows", build_brows, ("M_Moustache", lin("#1c1716"), 0.6, 0.0), rigid="Head", dec=4000),
        Part("Hair", build_hair, ("M_HairDark", lin("#231c19"), 0.55, 0.0), rigid="Head", paint=hair_paint, dec=26000),
        Part("Robe", build_robe, ("M_Robe", lin("#8a1d26"), 0.9, 0.0), bones=torso_b, uv=robe_uv, dec=24000, power=4, smooth=14,
             bias={"Spine": 1.4, "Chest": 1.3, "Body": 1.6, "LeftLeg": 0.35, "RightLeg": 0.35}),
        Part("Collar", build_collar, ("M_RobeTrim", lin("#4a0f16"), 0.85, 0.0), bones=["Spine", "Chest", "Neck", "Body"], dec=6000, power=4, smooth=8),
        Part("Cuffs", build_cuffs, ("M_RobeTrim", lin("#4a0f16"), 0.85, 0.0), bones=["LeftArm", "LeftForeArm", "RightArm", "RightForeArm"], dec=3000, power=6),
        Part("Shirt", build_shirt, ("M_Shirt2", lin("#ece6da"), 0.8, 0.0), bones=["Spine", "Chest", "Neck"], dec=6000, power=4, smooth=8),
        Part("Belt", build_belt, ("M_Rope", lin("#c9a877"), 0.95, 0.0), bones=["Body", "Spine"], dec=7000, power=4, smooth=8,
             bias={"Spine": 1.5}),
    ]
    for s, nm in ((1, "Left"), (-1, "Right")):
        fingers = [f"{nm}{f}{i}" for f in ("Thumb", "Index", "Middle", "Ring", "Pinky") for i in (1, 2, 3)]
        parts.append(Part(f"Arm{nm[0]}", build_arm(s), SKIN, bones=[f"{nm}Arm", f"{nm}ForeArm", f"{nm}Hand"] + fingers,
                          paint=arm_paint(s), dec=14000, power=7, smooth=3))
        parts.append(Part(f"PJ{nm[0]}", build_pj(s), ("M_PJ", lin("#3a3f52"), 0.9, 0.0), bones=["Body", f"{nm}Leg", f"{nm}Shin"],
                          uv=pj_uv, dec=5000, power=5))
        parts.append(Part(f"Ankle{nm[0]}", build_ankle(s), SKIN, bones=[f"{nm}Shin", f"{nm}Foot"], dec=1500, power=5))
        b, so, fl = slipper(s)
        parts.append(Part(f"Slipper{nm[0]}", b, ("M_Slipper", lin("#6b4128"), 0.8, 0.0), bones=feet(s, nm), dec=6000, power=5))
        parts.append(Part(f"SlipSole{nm[0]}", so, ("M_ShoeRubber", lin("#3a2a20"), 0.7, 0.0), bones=feet(s, nm)[:2], dec=3000, power=5))
        parts.append(Part(f"Fleece{nm[0]}", fl, ("M_Fleece", lin("#e8dcc4"), 0.95, 0.0), rigid=f"{nm}Foot", dec=4000))

    empties = [dict(name=f"Eye{'L' if s > 0 else 'R'}", pos=EYE[s], bone="Head",
                    props=dict(rx=0.0215, ry=0.02, rz=0.016, iris="#3b2414", lid="#e8b598", irisR=0.66, pupilR=0.32)) for s in (1, -1)]
    for s, nm in ((1, "Left"), (-1, "Right")):
        Wp, R = hand_frame(s)
        empties.append(dict(name=f"{nm}Grip", pos=Wp + R @ V(0.035, 0, -0.09), bone=f"{nm}Hand"))
    ao_obj = ck.build_character("mrodd", bones(), parts, out, empties, extras=dict(character="mrodd", height=1.8))
    if preview_dir:
        rk.preview(f"{preview_dir}/mrodd", target=(0, 0, 0.92), dist=4.0, views=((0, 6), (38, 6), (90, 4), (180, 6)))
        rk.preview(f"{preview_dir}/mrodd_face", target=(0, -0.02, 1.62), dist=1.05, views=((0, 4), (32, 6), (75, 2)), res=(560, 560))
    return ao_obj
