"""Shared sculpted parts for the small object characters: puffy 4-finger cartoon glove
(palm + separately pivoting fingers and thumb) and a chunky high-top sneaker.
Built in three.js axes through B() (x, y up, z forward), unit size; the app scales and recolours."""
import numpy as np
import bpy
from sdf import Grid, V, norm, sphere, ellipsoid, capsule, box, cylinder, torus, tube, bezier, halfspace, rot_x, sdf_ao, fbm
import rigkit as rk
from charkit import lin


def B(x, y, z):
    """three.js (x, y-up, z-forward) -> Blender (x, -z, y)"""
    return V(x, -z, y)


def Bv(p):
    p = V(p)
    return V(p[0], -p[2], p[1])


def G(a, b, vs, pad=0.0):
    """Grid spanning two B() corners in any order."""
    return Grid(np.minimum(a, b) - pad, np.maximum(a, b) + pad, vs)


def to_three(v):
    return np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)


# ------------------------------------------------------------------ glove (wrist at origin, fingers -y, thumb +x, palm +z)
FINGER_X = (0.33, 0.0, -0.33)


def glove_palm():
    g = G(B(-0.8, -1.4, -0.6), B(0.8, 0.3, 0.6), 0.012, 0.1)
    g.add(cylinder(B(0, -0.14, 0), 0.47, 0.16, 0.06, rot_x(90)))
    g.add(torus(B(0, -0.01, 0), 0.47, 0.105, rot_x(90)), k=0.03)
    g.add(ellipsoid(B(0, -0.68, 0.0), (0.57, 0.34, 0.62)), k=0.12)
    for x in FINGER_X:
        g.add(sphere(B(x, -1.05, 0.0), 0.2), k=0.12)
    for x in (-0.2, 0.0, 0.2):                         # stitched darts on the back
        g.sub(capsule(B(x, -0.34, -0.33), B(x * 1.1, -0.8, -0.34), 0.022), k=0.012)
    return g


def finger(x):
    def f():
        g = G(B(x - 0.35, -1.8, -0.35), B(x + 0.35, -0.8, 0.35), 0.01)
        pts = np.array([B(x, -0.98, 0.0), B(x * 1.1, -1.32, 0.03), B(x * 1.16, -1.6, 0.1)])
        g.add(tube(bezier(*pts, n=6), np.linspace(0.19, 0.172, 6)))
        return g
    return f


def thumb():
    g = G(B(0.2, -1.1, -0.3), B(1.1, -0.2, 0.5), 0.01)
    pts = np.array([B(0.42, -0.5, 0.08), B(0.72, -0.62, 0.2), B(0.86, -0.86, 0.3)])
    g.add(tube(bezier(*pts, n=6), np.linspace(0.19, 0.165, 6)))
    return g


# ------------------------------------------------------------------ sneaker (ankle at origin, toe +z, ground y = -0.44)
GY = -0.44


def sole():
    g = G(B(-0.4, GY - 0.05, -0.45), B(0.4, -0.1, 0.85), 0.008)
    g.add(ellipsoid(B(0, GY + 0.07, 0.2), (0.29, 0.53, 0.14)))
    g.intersect(halfspace(B(0, GY + 0.13, 0), V(0, 0, 1)), k=0.02)
    g.intersect(halfspace(B(0, GY, 0), V(0, 0, -1)), k=0.01)
    g.add(ellipsoid(B(0, GY + 0.15, 0.5), (0.245, 0.21, 0.15)), k=0.03)      # toe cap
    return g


def stripe():
    g = G(B(-0.42, GY - 0.02, -0.47), B(0.42, GY + 0.12, 0.87), 0.006)
    g.add(ellipsoid(B(0, GY + 0.07, 0.2), (0.297, 0.537, 0.145)))
    g.intersect(halfspace(B(0, GY + 0.085, 0), V(0, 0, 1)))
    g.intersect(halfspace(B(0, GY + 0.055, 0), V(0, 0, -1)))
    return g


def upper():
    g = G(B(-0.4, -0.5, -0.5), B(0.4, 0.25, 0.8), 0.008)
    g.add(ellipsoid(B(0, -0.22, 0.17), (0.255, 0.48, 0.21)))
    g.add(cylinder(B(0, -0.1, -0.1), 0.215, 0.2, 0.08), k=0.08)
    g.add(capsule(B(0, -0.08, 0.28), B(0, 0.06, -0.02), 0.085), k=0.05)      # tongue
    g.intersect(halfspace(B(0, GY + 0.12, 0), V(0, 0, -1)))
    g.sub(capsule(B(0, 0.0, -0.1), B(0, 0.4, -0.1), 0.13), k=0.02)            # ankle opening
    g.add(torus(B(0, 0.085, -0.1), 0.17, 0.035, np.eye(3)), k=0.02)           # padded collar
    return g


def laces():
    g = G(B(-0.3, -0.3, -0.1), B(0.3, 0.15, 0.5), 0.006)
    for i in range(4):
        z = 0.04 + i * 0.1
        y = -0.03 - i * 0.045
        g.add(capsule(B(-0.11, y, z - 0.04), B(0.11, y, z + 0.04), 0.022))
        g.add(capsule(B(-0.11, y, z + 0.04), B(0.11, y, z - 0.04), 0.022))
    return g


def patch():
    g = G(B(-0.35, -0.3, -0.3), B(0.35, 0.05, 0.1), 0.005)
    for s in (1, -1):
        g.add(cylinder(B(0.225 * s, -0.13, -0.1), 0.075, 0.012, 0.008, rot_x(0) @ np.array([[0, 0, 1], [0, 1, 0], [-1, 0, 0]])))
    return g


def build(out, preview_dir=None):
    rk.reset()
    rk._mats.clear()
    parts = {
        "Glove_Palm": (glove_palm, "M_Glove", "#f3efe6", None),
        "Glove_F0": (finger(FINGER_X[0]), "M_Glove", "#f3efe6", B(FINGER_X[0], -0.98, 0)),
        "Glove_F1": (finger(FINGER_X[1]), "M_Glove", "#f3efe6", B(FINGER_X[1], -0.98, 0)),
        "Glove_F2": (finger(FINGER_X[2]), "M_Glove", "#f3efe6", B(FINGER_X[2], -0.98, 0)),
        "Glove_Thumb": (thumb, "M_Glove", "#f3efe6", B(0.42, -0.5, 0.08)),
        "Shoe_Sole": (sole, "M_ShoeSole", "#f1ede4", None),
        "Shoe_Stripe": (stripe, "M_ShoeStripe", "#2a2a2a", None),
        "Shoe_Upper": (upper, "M_ShoeUpper", "#c8262c", None),
        "Shoe_Laces": (laces, "M_ShoeLace", "#f6f4ee", None),
        "Shoe_Patch": (patch, "M_ShoeSole", "#f1ede4", None),
    }
    grids = {}
    objs = {}
    for name, (fn, mname, col, pivot) in parts.items():
        g = fn()
        grids[name] = g
        v, f = g.mesh()
        ob = rk.new_mesh(name, v, f, rk.material(mname, lin(col), 0.7, 0.0), decimate=3500 if name.startswith("Glove") else 4000)
        objs[name] = (ob, pivot)
    glove_g = [grids[k] for k in grids if k.startswith("Glove")]
    shoe_g = [grids[k] for k in grids if k.startswith("Shoe")]
    for name, (ob, pivot) in objs.items():
        P, T, N = rk.mesh_arrays(ob)
        gs = glove_g if name.startswith("Glove") else shoe_g
        samp = lambda Q: np.min([gg.sample(Q) for gg in gs], axis=0)
        ao = sdf_ao(samp, P, N, dist=(0.04, 0.09, 0.16, 0.26))
        rk.set_vertex_colors(ob, np.ones((len(P), 3)) * (0.35 + 0.65 * ao)[:, None])
        if pivot is not None:
            me = ob.data
            co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get("co", co)
            co = co.reshape(-1, 3) - pivot
            me.vertices.foreach_set("co", co.ravel())
            ob.location = tuple(pivot)
    # fingers + thumb as children of the palm so they pivot at the knuckles
    palm = objs["Glove_Palm"][0]
    for k in ("Glove_F0", "Glove_F1", "Glove_F2", "Glove_Thumb"):
        objs[k][0].parent = palm
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_vertex_color="ACTIVE",
                              export_all_vertex_colors=False, export_animations=False, export_materials="EXPORT",
                              export_image_format="NONE", export_extras=True)
    import os
    print("kit_tiny:", os.path.getsize(out) / 1e6, "MB")
    if preview_dir:
        for k, (ob, p) in objs.items():
            if k.startswith("Shoe"):
                ob.location = (ob.location[0] + 1.4, ob.location[1], ob.location[2] + 0.44)
        rk.preview(f"{preview_dir}/kit", target=(0.7, 0, -0.4), dist=4.2, views=((20, 15), (120, 20)), res=(640, 480))
