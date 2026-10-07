"""Character assembly: SDF parts -> Blender meshes with AO/paint, UVs and skin weights -> GLB."""
import os
import time
import numpy as np
import bpy

import rigkit as rk
from sdf import Grid, sdf_ao, V


def lin(hexstr):
    """sRGB hex -> linear rgb tuple."""
    h = hexstr.lstrip("#")
    c = np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


class Part:
    """One mesh of a character.

    build()   -> Grid (sculpted distance field) or (verts, faces)
    mat       -> (material name, linear colour, roughness, metal)
    bones     -> list of allowed deform bones (distance weights) | rigid="Bone"
    uv        -> None | "box" | callable(P, N) -> (uv, wrap)
    paint     -> callable(P, N) -> rgb multiplier (before AO)
    """

    def __init__(self, name, build, mat, bones=None, rigid=None, uv="box", paint=None, dec=None,
                 power=6.0, smooth=6, bias=None, occlude=True, ao=1.0, weights=None, post=None):
        self.name, self.build, self.mat = name, build, mat
        self.bones, self.rigid, self.uv, self.paint = bones, rigid, uv, paint
        self.dec, self.power, self.smooth, self.bias = dec, power, smooth, bias
        self.occlude, self.ao, self.weights, self.post = occlude, ao, weights, post
        self.grid = None
        self.obj = None


def build_character(name, bones, parts, out_glb, empties=(), preview=None, extras=None, shape_keys=None):
    t0 = time.time()
    rk.reset()
    rk._mats.clear()
    ao_obj = rk.armature("Rig", bones)
    if extras:
        for k, v in extras.items():
            ao_obj[k] = v
    bone_seg = {b["name"]: (V(b["head"]), V(b["tail"])) for b in bones}

    # 1. sculpt every part
    for p in parts:
        t = time.time()
        g = p.build()
        if isinstance(g, Grid):
            p.grid = g
            v, f = g.mesh()
        else:
            v, f = g
        mname, col, rough, metal = p.mat
        p.obj = rk.new_mesh(f"{p.name}Mesh", v, f, rk.material(mname, col, rough, metal), decimate=p.dec)   # never shares a bone's name
        print(f"  {p.name:<14} {len(v):>7} v -> {len(p.obj.data.vertices):>6} v   {time.time() - t:5.1f}s", flush=True)

    grids = [p.grid for p in parts if p.grid is not None and p.occlude]

    def occ_sample(P):
        d = np.full(len(P), 1.0)
        for g in grids:
            d = np.minimum(d, g.sample(P))
        return d

    # 2. paint, AO, UVs, weights
    for p in parts:
        P, T, N = rk.mesh_arrays(p.obj)
        ao = sdf_ao(occ_sample, P, N) if p.ao > 0 else np.ones(len(P))
        ao = 1.0 - p.ao * (1.0 - ao)
        tint = p.paint(P, N) if p.paint else np.ones((len(P), 3))
        shade = (0.28 + 0.72 * ao)[:, None]
        rk.set_vertex_colors(p.obj, tint * shade)
        if p.uv == "box":
            set_box_uv(p.obj)
        elif callable(p.uv):
            uv, wrap = p.uv(P, N)
            rk.set_uv(p.obj, uv, wrap)
        if p.weights is not None:
            w = p.weights(P, T, bone_seg)
        elif p.rigid:
            w = {p.rigid: np.ones(len(P))}
        else:
            w = rk.auto_weights(P, T, bone_seg, p.bones, p.power, p.smooth, 0.5, p.bias)
        rk.skin(p.obj, ao_obj, w)
        if p.post:
            p.post(p.obj, P, N)
    if shape_keys:
        shape_keys({p.name: p for p in parts})

    for e in empties:
        ob = rk.empty(e["name"], e["pos"], e.get("scale", 1.0), e.get("rot"))
        for k, v in e.get("props", {}).items():
            ob[k] = v
        rk.attach_to_bone(ob, ao_obj, e["bone"])

    os.makedirs(os.path.dirname(out_glb), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_glb, export_format="GLB", export_yup=True, export_apply=False,
        export_skins=True, export_morph=True, export_morph_normal=True,
        export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_animations=False, export_cameras=False, export_lights=False,
        export_materials="EXPORT", export_image_format="NONE", export_extras=True,
    )
    print(f"{name}: {os.path.getsize(out_glb) / 1e6:.2f} MB  {sum(len(p.obj.data.vertices) for p in parts)} verts  {time.time() - t0:.0f}s", flush=True)
    if preview:
        preview(ao_obj)
    return ao_obj


def set_box_uv(ob, scale=1.0):
    """Box projection per face (UVs in metres) - for tiling fabric / noise textures."""
    me = ob.data
    lay = me.uv_layers.new(name="UVMap")
    co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    li = np.zeros(len(me.loops), dtype=np.int64); me.loops.foreach_get("vertex_index", li)
    fn = np.zeros(len(me.polygons) * 3); me.polygons.foreach_get("normal", fn); fn = fn.reshape(-1, 3)
    ls = np.zeros(len(me.polygons), dtype=np.int64); me.polygons.foreach_get("loop_start", ls)
    lt = np.zeros(len(me.polygons), dtype=np.int64); me.polygons.foreach_get("loop_total", lt)
    poly_of_loop = np.repeat(np.arange(len(me.polygons)), lt)
    ax = np.argmax(np.abs(fn), axis=1)[poly_of_loop]
    P = co[li] * scale
    uv = np.where(ax[:, None] == 0, P[:, [1, 2]], np.where(ax[:, None] == 1, P[:, [0, 2]], P[:, [0, 1]]))
    lay.data.foreach_set("uv", uv.astype(np.float32).ravel())


def pose_and_preview(ao_obj, path, poses, **kw):
    """Apply {bone: (x, y, z) degrees} in pose mode, then render a preview strip."""
    from mathutils import Euler
    for name, rot in poses.items():
        pb = ao_obj.pose.bones.get(name)
        if pb:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = Euler([np.radians(a) for a in rot])
    bpy.context.view_layer.update()
    return rk.preview(path, **kw)
