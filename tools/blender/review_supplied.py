"""Inventory and CPU-render an unchanged supplied asset before adapting it.

blender -b -P tools/blender/review_supplied.py -- SOURCE OUTPUT_DIR
"""
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, output = Path(args[0]).resolve(), Path(args[1]).resolve()
output.mkdir(parents=True, exist_ok=True)
if source.suffix == '.blend':
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
for img in bpy.data.images:
    if img.source == 'FILE' and not img.packed_file:
        matches = list(source.parent.rglob(Path(img.filepath.replace(chr(92), '/')).name))
        if matches:
            img.filepath = str(matches[0])
            img.reload()
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name != 'Icosphere']
for obj in bpy.context.scene.objects:
    if obj.name == 'Icosphere' or obj.type in {'LIGHT', 'CAMERA'}:
        obj.hide_render = True
bpy.context.view_layer.update()
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
center, size = (lo + hi) / 2, hi - lo
report = {'source': str(source), 'bounds': [list(lo), list(hi)], 'size': list(size), 'meshes': [], 'rigs': []}
for obj in meshes:
    report['meshes'].append({'name': obj.name, 'vertices': len(obj.data.vertices), 'triangles': sum(len(p.vertices)-2 for p in obj.data.polygons), 'materials': [m.name if m else None for m in obj.data.materials], 'matrix': [list(row) for row in obj.matrix_world]})
for rig in [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']:
    report['rigs'].append({'name': rig.name, 'matrix': [list(row) for row in rig.matrix_world], 'bones': [{'name': b.name, 'parent': b.parent.name if b.parent else None, 'head': list(rig.matrix_world @ b.head_local), 'tail': list(rig.matrix_world @ b.tail_local)} for b in rig.data.bones]})
(output / 'inventory.json').write_text(json.dumps(report, indent=2))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8
scene.render.threads_mode = 'FIXED'
scene.render.threads = 3
scene.render.resolution_x = 640
scene.render.resolution_y = 720 if size.z > size.x else 480
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Review world')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.28, 0.32, 0.38, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.65
bpy.ops.object.light_add(type='SUN', location=center + Vector((2, -3, 5)))
light = bpy.context.object
light.rotation_euler = (0.35, -0.4, -0.4)
light.data.energy = 2.2
light.data.angle = 0.15
bpy.ops.object.camera_add()
cam = bpy.context.object
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.clip_end = max(size) * 10
cam.data.ortho_scale = max(size) * 1.35
for name, direction in [('front', (0, -3, 0.25)), ('three-quarter', (1.7, -3, 1.2)), ('back', (0, 3, 0.25))] if size.z > size.x else [('overview', (1.7, -2, 2.5))]:
    cam.location = center + Vector(direction) * max(size)
    cam.rotation_euler = (center-cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(output / f'{name}.png')
    bpy.ops.render.render(write_still=True)
print('REVIEW_READY', output)
