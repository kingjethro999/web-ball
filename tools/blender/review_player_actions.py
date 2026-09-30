"""Render exported player and exported actions, not the authoring scene."""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['rest','jog','sprint','shoot','gk_stance','gk_dive_left']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/supplied/footballer.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
existing=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/supplied/football-actions.glb'))
for o in list(bpy.context.scene.objects):
 if o not in existing or o.name.startswith('Icosphere'):bpy.data.objects.remove(o,do_unlink=True)
rig.animation_data_create()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.threads_mode='FIXED';scene.render.threads=3
scene.render.resolution_x=540;scene.render.resolution_y=620;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.28,.32,.38,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.35,-.4,-.4);bpy.context.object.data.energy=2.2;bpy.context.object.data.angle=.15
bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.005));ground=bpy.context.object;mat=bpy.data.materials.new('Grass');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.065,.13,.07,1);ground.data.materials.append(mat)
bpy.ops.object.camera_add(location=(2,-4,.95));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.88))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.3;scene.camera=cam
out=ROOT/'artifacts/supplied-review/actions';out.mkdir(parents=True,exist_ok=True)
for label in args:
 name,sep,fraction=label.partition('@')
 if name=='rest':rig.animation_data.action=None;scene.frame_set(0)
 else:
  a=bpy.data.actions.get(name)
  if not a:raise RuntimeError('Missing action '+name)
  rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0]
  start,end=a.frame_range;scene.frame_set(round(start+(end-start)*(float(fraction) if sep else .5)))
 bpy.context.view_layer.update();scene.render.filepath=str(out/(label+'.png'));bpy.ops.render.render(write_still=True)
print('PLAYER_REVIEW_READY')
