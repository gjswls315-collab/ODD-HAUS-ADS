"""Blender side of the character pipeline: meshes, armatures, skin weights, GLB export,
and quick Cycles clay previews. Runs inside `bpy` used as a Python module.
"""
import math
import numpy as np
import bpy
import bmesh
from mathutils import Matrix, Vector
from scipy import sparse

from sdf import V, norm


# ------------------------------------------------------------------ scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ------------------------------------------------------------------ materials
_mats = {}


def material(name, color=(0.8, 0.8, 0.8), rough=0.6, metal=0.0, use_vcol=True):
    """Simple Principled material. Vertex colour (AO + painted tint) multiplies base colour.
    The web app swaps these for its own materials by name; the colours keep the GLB usable alone."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if use_vcol:
        attr = nt.nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Color"
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs["A"].default_value = (*color, 1.0)
        nt.links.new(attr.outputs["Color"], mix.inputs["B"])
        nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    _mats[name] = m
    return m


# ------------------------------------------------------------------ meshes
def new_mesh(name, verts, faces, mat=None, decimate=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(np.asarray(verts).tolist(), [], np.asarray(faces).tolist())
    me.validate(clean_customdata=False)
    ob = link(bpy.data.objects.new(name, me))
    if mat is not None:
        ob.data.materials.append(mat)
    if decimate:
        target = decimate if decimate > 1 else int(len(faces) * decimate)
        ratio = min(1.0, target / max(1, len(faces)))
        if ratio < 0.999:
            mod = ob.modifiers.new("dec", "DECIMATE")
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            apply_modifiers(ob)
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = True
    return ob


def apply_modifiers(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def mesh_arrays(ob):
    me = ob.data
    v = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get("co", v)
    me.calc_loop_triangles()
    t = np.zeros(len(me.loop_triangles) * 3, dtype=np.int64)
    me.loop_triangles.foreach_get("vertices", t)
    n = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get("normal", n)
    return v.reshape(-1, 3), t.reshape(-1, 3), n.reshape(-1, 3)


def set_vertex_colors(ob, rgb):
    me = ob.data
    ca = me.color_attributes.new("Color", "FLOAT_COLOR", "POINT")
    rgba = np.concatenate([np.clip(rgb, 0, 4), np.ones((len(rgb), 1))], axis=1).astype(np.float32)
    ca.data.foreach_set("color", rgba.ravel())
    me.color_attributes.active_color = ca
    me.attributes.active_color = ca


def set_uv(ob, uv_vert, wrap=None):
    """Per-vertex UVs written per loop. `wrap` = period in U (cylindrical maps) to fix seams."""
    me = ob.data
    lay = me.uv_layers.new(name="UVMap")
    li = np.zeros(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", li)
    uv = uv_vert[li].copy()
    if wrap:
        for p in me.polygons:
            s, n = p.loop_start, p.loop_total
            u = uv[s:s + n, 0]
            if u.max() - u.min() > wrap * 0.5:
                u[u < wrap * 0.5] += wrap
                uv[s:s + n, 0] = u
    lay.data.foreach_set("uv", uv.astype(np.float32).ravel())


def adjacency(nv, tris):
    i = np.concatenate([tris[:, 0], tris[:, 1], tris[:, 2], tris[:, 1], tris[:, 2], tris[:, 0]])
    j = np.concatenate([tris[:, 1], tris[:, 2], tris[:, 0], tris[:, 0], tris[:, 1], tris[:, 2]])
    A = sparse.coo_matrix((np.ones(len(i)), (i, j)), shape=(nv, nv)).tocsr()
    A.data[:] = 1.0
    deg = np.asarray(A.sum(1)).ravel()
    deg[deg == 0] = 1
    return sparse.diags(1.0 / deg) @ A


def smooth_field(A, X, iters=4, lam=0.5):
    for _ in range(iters):
        X = (1 - lam) * X + lam * (A @ X)
    return X


# ------------------------------------------------------------------ armature
def armature(name, bones):
    """bones: list of dicts {name, head, tail, parent, roll_to (vector for Z axis), deform}."""
    arm = bpy.data.armatures.new(name)
    ao = link(bpy.data.objects.new(name, arm))
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for b in bones:
        e = arm.edit_bones.new(b["name"])
        e.head = Vector(b["head"])
        e.tail = Vector(b["tail"])
        if b.get("parent"):
            e.parent = eb[b["parent"]]
            e.use_connect = False
        if b.get("roll_to") is not None:
            e.align_roll(Vector(b["roll_to"]))
        e.use_deform = b.get("deform", True)
        eb[b["name"]] = e
    bpy.ops.object.mode_set(mode="OBJECT")
    return ao


def seg_dist(P, a, b):
    a, b = V(a), V(b)
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def auto_weights(P, tris, bones, allowed, power=6.0, smooth=6, lam=0.5, bias=None, rigid=None):
    """Distance-to-bone weights, sharpened by `power`, then diffused over the surface.
    bones: {name: (head, tail)}. bias: {name: multiplier}. rigid: single bone name."""
    if rigid:
        return {rigid: np.ones(len(P))}
    D = np.stack([seg_dist(P, *bones[n]) for n in allowed], axis=1)
    D = np.maximum(D, 1e-4)
    W = D ** (-power)
    if bias:
        for i, n in enumerate(allowed):
            W[:, i] *= bias.get(n, 1.0)
    W /= W.sum(1, keepdims=True)
    if smooth and len(tris):
        A = adjacency(len(P), tris)
        W = smooth_field(A, W, smooth, lam)
    # keep the 4 strongest influences
    if W.shape[1] > 4:
        idx = np.argsort(-W, axis=1)[:, 4:]
        np.put_along_axis(W, idx, 0.0, axis=1)
    W /= W.sum(1, keepdims=True) + 1e-12
    return {n: W[:, i] for i, n in enumerate(allowed)}


def skin(ob, ao, weights):
    for name, w in weights.items():
        nz = np.nonzero(w > 1e-4)[0]
        if len(nz) == 0:
            continue
        vg = ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name)
        for i in nz:
            vg.add([int(i)], float(w[i]), "REPLACE")
    ob.parent = ao
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = ao


def attach_to_bone(ob, ao, bone, world=None):
    """Rigid child of a bone (props, eye sockets)."""
    bpy.context.view_layer.update()
    mw = ob.matrix_world.copy() if world is None else world
    ob.parent = ao
    ob.parent_type = "BONE"
    ob.parent_bone = bone
    bpy.context.view_layer.update()
    ob.matrix_world = mw


def empty(name, pos, scale=1.0, rot=None):
    e = link(bpy.data.objects.new(name, None))
    e.empty_display_size = 0.02
    m = Matrix.Translation(Vector(pos))
    if rot is not None:
        m = m @ Matrix(np.asarray(rot).tolist()).to_4x4()
    e.matrix_world = m @ Matrix.Scale(scale, 4)
    return e


def shape_key(ob, name, coords):
    if ob.data.shape_keys is None:
        ob.shape_key_add(name="Basis", from_mix=False)
    k = ob.shape_key_add(name=name, from_mix=False)
    k.data.foreach_set("co", np.asarray(coords, dtype=np.float32).ravel())
    return k


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_yup=True, export_apply=False,
        export_skins=True, export_morph=True, export_morph_normal=True,
        export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_animations=False, export_cameras=False, export_lights=False,
        export_materials="EXPORT", export_image_format="NONE",
    )


# ------------------------------------------------------------------ previews
def preview(path, target=(0, 0, 0.8), dist=3.0, views=((0, 8), (35, 8), (90, 5)), res=(520, 680),
            samples=48, lens=60, extra=None):
    """Cycles turnaround stills -> one horizontal strip PNG."""
    from PIL import Image
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("w"); sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.05, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    if "PreviewFloor" not in bpy.data.objects:
        bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
        fl = bpy.context.object; fl.name = "PreviewFloor"
        fl.data.materials.append(material("PreviewFloorM", (0.25, 0.23, 0.22), 0.8, use_vcol=False))

        def area(name, loc, energy, size, color=(1, 1, 1)):
            ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
            lo = link(bpy.data.objects.new(name, ld)); lo.location = loc
            d = Vector(target) - Vector(loc)
            lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        s = dist / 3.0
        area("Key", (-2.2 * s, -2.6 * s, 2.8 * s + target[2]), 900 * s * s, 2.0 * s, (1.0, 0.92, 0.82))
        area("Rim", (2.0 * s, 2.4 * s, 2.2 * s + target[2]), 700 * s * s, 1.5 * s, (0.75, 0.85, 1.0))
        area("Fill", (2.6 * s, -2.0 * s, 0.9 * s + target[2]), 220 * s * s, 3.0 * s, (0.9, 0.95, 1.0))
    cam = bpy.data.objects.get("PreviewCam")
    if cam is None:
        cam = link(bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam")))
    cam.data.lens = lens
    sc.camera = cam
    imgs = []
    for i, (az, el) in enumerate(views):
        a, e = math.radians(az), math.radians(el)
        tgt = Vector(target)
        cam.location = tgt + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
        cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        if extra:
            extra(i)
        fp = f"{path}_v{i}.png"
        sc.render.filepath = fp
        bpy.ops.render.render(write_still=True)
        imgs.append(Image.open(fp).convert("RGB"))
    W = sum(im.width for im in imgs)
    sheet = Image.new("RGB", (W, imgs[0].height))
    x = 0
    for im in imgs:
        sheet.paste(im, (x, 0)); x += im.width
    sheet.save(path + ".png")
    return path + ".png"
