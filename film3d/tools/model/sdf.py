"""Signed-distance modelling kit (numpy) -> watertight meshes via marching cubes.

Characters are sculpted as smooth unions of analytic shapes (round cones, ellipsoids,
rounded boxes, tori, curved tubes) evaluated on a voxel grid. Every primitive is only
evaluated inside its own bounding box, so thousands of small shapes (fur tufts, curls,
fingers) stay cheap.

Coordinates are Blender's: metres, Z up, character faces -Y, character's left is +X.
"""
import numpy as np
from skimage.measure import marching_cubes
from scipy.ndimage import map_coordinates

BIG = 1.0


def V(*a):
    if len(a) == 1:
        return np.asarray(a[0], dtype=np.float64)
    return np.asarray(a, dtype=np.float64)


def norm(v):
    v = V(v)
    return v / (np.linalg.norm(v) + 1e-12)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


# ------------------------------------------------------------------ rotations
def rot_x(deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def euler(x=0, y=0, z=0):
    """XYZ euler in degrees -> 3x3 (local -> world)."""
    return rot_z(z) @ rot_y(y) @ rot_x(x)


def frame(z_axis, up=(0, 0, 1)):
    """Rotation whose local +Z points along z_axis (local +Y as close to `up` as possible)."""
    z = norm(z_axis)
    u = V(up)
    if abs(np.dot(z, norm(u))) > 0.98:
        u = V(1, 0, 0) if abs(z[0]) < 0.9 else V(0, 1, 0)
    x = norm(np.cross(u, z))
    y = np.cross(z, x)
    return np.stack([x, y, z], axis=1)


# ------------------------------------------------------------------ primitives
class Prim:
    """f(P) -> distances for P of shape (..., 3); lo/hi world bounding box."""

    def __init__(self, f, lo, hi):
        self.f, self.lo, self.hi = f, V(lo), V(hi)


def _local(P, c, R):
    Q = P - c
    if R is not None:
        Q = Q @ R  # world -> local (R columns are local axes)
    return Q


def _bbox_rotated(c, half, R):
    if R is None:
        return c - half, c + half
    ext = np.abs(R) @ half
    return c - ext, c + ext


def sphere(c, r):
    c = V(c)
    return Prim(lambda P: np.linalg.norm(P - c, axis=-1) - r, c - r, c + r)


def ellipsoid(c, r, R=None):
    c, r = V(c), V(r)

    def f(P):
        Q = _local(P, c, R)
        k0 = np.linalg.norm(Q / r, axis=-1)
        k1 = np.linalg.norm(Q / (r * r), axis=-1)
        return k0 * (k0 - 1.0) / (k1 + 1e-9)

    lo, hi = _bbox_rotated(c, r, R)
    return Prim(f, lo, hi)


def capsule(a, b, ra, rb=None):
    """Round cone between points a and b with radii ra -> rb (exact SDF)."""
    a, b = V(a), V(b)
    rb = ra if rb is None else rb
    ba = b - a
    l2 = float(np.dot(ba, ba))
    if l2 < 1e-12:
        return sphere(a, max(ra, rb))
    rr = ra - rb
    a2 = l2 - rr * rr
    il2 = 1.0 / l2

    def f(P):
        pa = P - a
        y = pa @ ba
        z = y - l2
        x2v = pa * l2 - y[..., None] * ba
        x2 = np.einsum("...i,...i->...", x2v, x2v)
        y2 = y * y * l2
        z2 = z * z * l2
        k = np.sign(rr) * rr * rr * x2
        d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - ra
        d1 = np.sqrt(x2 + z2) * il2 - rb
        d2 = np.sqrt(x2 + y2) * il2 - ra
        out = np.where(np.sign(y) * a2 * y2 < k, d2, d3)
        out = np.where(np.sign(z) * a2 * z2 > k, d1, out)
        return out

    r = max(ra, rb)
    return Prim(f, np.minimum(a, b) - r, np.maximum(a, b) + r)


def box(c, half, rad=0.0, R=None):
    c, half = V(c), V(half)

    def f(P):
        Q = np.abs(_local(P, c, R)) - half + rad
        out = np.linalg.norm(np.maximum(Q, 0), axis=-1) + np.minimum(np.max(Q, axis=-1), 0)
        return out - rad

    lo, hi = _bbox_rotated(c, half, R)
    return Prim(f, lo, hi)


def cylinder(c, r, h, rad=0.0, R=None):
    """Capped cylinder along local Z, radius r, half height h, edge rounding rad."""
    c = V(c)

    def f(P):
        Q = _local(P, c, R)
        dx = np.linalg.norm(Q[..., :2], axis=-1) - r + rad
        dy = np.abs(Q[..., 2]) - h + rad
        out = np.minimum(np.maximum(dx, dy), 0) + np.sqrt(np.maximum(dx, 0) ** 2 + np.maximum(dy, 0) ** 2)
        return out - rad

    lo, hi = _bbox_rotated(c, V(r, r, h), R)
    return Prim(f, lo, hi)


def torus(c, R_, r, R=None, arc=None):
    """Torus in the local XY plane (axis local Z). arc=(a0, a1) degrees limits it to an arc."""
    c = V(c)

    def f(P):
        Q = _local(P, c, R)
        if arc is not None:
            ang = np.degrees(np.arctan2(Q[..., 1], Q[..., 0]))
            mid = 0.5 * (arc[0] + arc[1]); half = 0.5 * (arc[1] - arc[0])
            da = (ang - mid + 180) % 360 - 180
            inside = np.abs(da) <= half
            a = np.radians(np.clip(da, -half, half) + mid)
            cx, cy = R_ * np.cos(a), R_ * np.sin(a)
            dpt = np.sqrt((Q[..., 0] - cx) ** 2 + (Q[..., 1] - cy) ** 2 + Q[..., 2] ** 2) - r
            q = np.sqrt((np.linalg.norm(Q[..., :2], axis=-1) - R_) ** 2 + Q[..., 2] ** 2) - r
            return np.where(inside, q, dpt)
        q = np.sqrt((np.linalg.norm(Q[..., :2], axis=-1) - R_) ** 2 + Q[..., 2] ** 2) - r
        return q

    lo, hi = _bbox_rotated(c, V(R_ + r, R_ + r, r), R)
    return Prim(f, lo, hi)


def bezier(p0, p1, p2, p3=None, n=10):
    """Points on a quadratic (or cubic) Bezier."""
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2 = V(p0), V(p1), V(p2)
    if p3 is None:
        return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
    p3 = V(p3)
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3


class Union(Prim):
    """Smooth union of several primitives evaluated together (used for tubes, curls)."""

    def __init__(self, prims, k=0.0):
        self.prims = prims
        self.k = k
        lo = np.min([p.lo for p in prims], axis=0)
        hi = np.max([p.hi for p in prims], axis=0)
        super().__init__(self._f, lo, hi)

    def _f(self, P):
        d = None
        for p in self.prims:
            x = p.f(P)
            d = x if d is None else smin(d, x, self.k)
        return d


def tube(points, radii, k=0.0):
    """Round-cone chain through points with per-point radii."""
    pts = V(points)
    rs = np.broadcast_to(V(radii), (len(pts),))
    return Union([capsule(pts[i], pts[i + 1], rs[i], rs[i + 1]) for i in range(len(pts) - 1)], k)


def shell(prim, thick):
    """Hollow version (|d| - thick)."""
    return Prim(lambda P: np.abs(prim.f(P)) - thick, prim.lo - thick, prim.hi + thick)


def offset(prim, amount):
    return Prim(lambda P: prim.f(P) - amount, prim.lo - amount, prim.hi + amount)


def halfspace(point, normal):
    """Negative on the side the normal points away from (keeps the -normal side)."""
    p, n = V(point), norm(normal)
    return Prim(lambda P: (P - p) @ n, V(-9, -9, -9), V(9, 9, 9))


# ------------------------------------------------------------------ noise
def _hash(ix, iy, iz, seed):
    n = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761 & 0xFFFFFFFF)
    n = (n ^ (n >> 13)) * 1274126177
    n = n ^ (n >> 16)
    return (n & 0xFFFF).astype(np.float64) / 65535.0 * 2.0 - 1.0


def vnoise(P, freq=1.0, seed=0):
    Q = P * freq
    i = np.floor(Q).astype(np.int64)
    f = Q - i
    u = f * f * (3 - 2 * f)
    out = 0.0
    for dx in (0, 1):
        wx = u[..., 0] if dx else 1 - u[..., 0]
        for dy in (0, 1):
            wy = u[..., 1] if dy else 1 - u[..., 1]
            for dz in (0, 1):
                wz = u[..., 2] if dz else 1 - u[..., 2]
                out = out + wx * wy * wz * _hash(i[..., 0] + dx, i[..., 1] + dy, i[..., 2] + dz, seed)
    return out


def fbm(P, freq=1.0, octaves=3, seed=0, gain=0.5):
    amp, tot, out = 1.0, 0.0, 0.0
    for o in range(octaves):
        out = out + amp * vnoise(P, freq * (2 ** o), seed + o * 17)
        tot += amp
        amp *= gain
    return out / tot


# ------------------------------------------------------------------ grid
class Grid:
    def __init__(self, lo, hi, vs, margin=None):
        m = vs * 3 if margin is None else margin
        self.lo = V(lo) - m
        self.vs = float(vs)
        self.n = (np.ceil((V(hi) + m - self.lo) / vs).astype(int) + 1)
        self.d = np.full(tuple(self.n), BIG, np.float32)
        self.xf = None

    def place(self, c_from, c_to, s):
        """Scale the finished sculpt by s about c_from and move it to c_to (mesh + sampling)."""
        self.xf = (V(c_from), V(c_to), float(s))
        return self

    def _range(self, lo, hi):
        i0 = np.clip(np.floor((lo - self.lo) / self.vs).astype(int), 0, self.n)
        i1 = np.clip(np.ceil((hi - self.lo) / self.vs).astype(int) + 1, 0, self.n)
        return i0, i1

    def points(self, i0, i1):
        xs = [self.lo[k] + np.arange(i0[k], i1[k]) * self.vs for k in range(3)]
        X, Y, Z = np.meshgrid(*xs, indexing="ij")
        return np.stack([X, Y, Z], axis=-1)

    def _apply(self, prim, k, op, mask=None):
        m = k + 2 * self.vs
        i0, i1 = self._range(prim.lo - m, prim.hi + m)
        if np.any(i1 <= i0):
            return
        sl = tuple(slice(a, b) for a, b in zip(i0, i1))
        P = self.points(i0, i1)
        dp = prim.f(P).astype(np.float32)
        if mask is not None:
            dp = np.maximum(dp, mask.f(P).astype(np.float32))
        cur = self.d[sl]
        if op == "add":
            self.d[sl] = smin(cur, dp, k)
        elif op == "sub":
            self.d[sl] = smax(cur, -dp, k)

    def add(self, prim, k=0.0, mask=None):
        """Smooth union. `mask` (a Prim) clips the added shape to mask's inside."""
        self._apply(prim, k, "add", mask)
        return self

    def sub(self, prim, k=0.0):
        self._apply(prim, k, "sub")
        return self

    def intersect(self, prim, k=0.0):
        P = self.points(np.zeros(3, int), self.n)
        self.d = smax(self.d, prim.f(P).astype(np.float32), k)
        return self

    def displace(self, fn, band=0.02):
        """d += fn(P) for voxels near the surface."""
        idx = np.nonzero(np.abs(self.d) < band)
        if len(idx[0]) == 0:
            return self
        P = self.lo + np.stack(idx, axis=-1) * self.vs
        self.d[idx] += fn(P).astype(np.float32)
        return self

    def sample(self, P):
        """Trilinear sample (outside the grid -> BIG)."""
        s = 1.0
        if self.xf is not None:
            cf, ct, s = self.xf
            P = cf + (P - ct) / s
        idx = ((P - self.lo) / self.vs).T
        return map_coordinates(self.d, idx, order=1, mode="constant", cval=BIG) * s

    def mesh(self, level=0.0):
        if self.d.min() >= level:
            raise ValueError("empty grid")
        v, f, n, _ = marching_cubes(self.d, level, spacing=(self.vs,) * 3, allow_degenerate=False)
        v = v + self.lo
        # outward winding check
        a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
        vol = np.einsum("ij,ij->i", a, np.cross(b, c)).sum()
        if vol < 0:
            f = f[:, ::-1]
        if self.xf is not None:
            cf, ct, sc = self.xf
            v = ct + (v - cf) * sc
        return v, f


def grad(sample_fn, P, h=1e-3):
    g = np.zeros_like(P)
    for k in range(3):
        e = np.zeros(3); e[k] = h
        g[:, k] = (sample_fn(P + e) - sample_fn(P - e)) / (2 * h)
    return g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-9)


def sdf_ao(sample_fn, P, N, dist=(0.006, 0.014, 0.028, 0.05, 0.08), strength=1.0):
    """Ambient occlusion from a distance field: how much nearby geometry crowds each point."""
    occ = np.zeros(len(P))
    w = 1.0
    for h in dist:
        d = sample_fn(P + N * h)
        occ += w * np.clip((h - d) / h, 0, 1)
        w *= 0.72
    occ /= sum(0.72 ** i for i in range(len(dist)))
    return np.clip(1.0 - strength * occ, 0.0, 1.0)


def lock(points, widths, thick, normals, k=0.004):
    """Flat hair lock: oriented ellipsoids along a path (width across, thin along `normals`)."""
    pts = V(points)
    prims = []
    for i in range(len(pts)):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        t = norm(b - a)
        n = norm(V(normals[i]) - t * (V(normals[i]) @ t))
        x = np.cross(n, t)
        R = np.stack([x, n, t], axis=1)
        seg = np.linalg.norm(b - a) * (0.5 if 0 < i < len(pts) - 1 else 1.0)
        prims.append(ellipsoid(pts[i], (max(widths[i], 1e-4), max(thick[i], 1e-4), max(seg * 0.9, widths[i] * 0.6, 1e-4)), R))
    return Union(prims, k)
