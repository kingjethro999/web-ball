"""Bake supplied Stadium 1 modifiers and align its pitch to 105 x 68 metres."""
import bpy,bmesh,sys,json,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
root=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]).resolve();out=Path(args[1]).resolve();out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
missing=[]
for mat in bpy.data.materials:
 if not mat.use_nodes:continue
 for n in list(mat.node_tree.nodes):
  if n.type!='TEX_IMAGE' or not n.image:continue
  matches=list(source.parent.rglob(Path(n.image.filepath.replace(chr(92),'/')).name))
  if matches:n.image.filepath=str(matches[0]);n.image.reload()
  elif not n.image.packed_file:
   missing.append(n.image.name)
   # Preserve base material colors where the provided archive has no image.
   for link in list(mat.node_tree.links):
    if link.from_node==n:
     if link.to_socket.type=='RGBA':link.to_socket.default_value=mat.diffuse_color
     mat.node_tree.links.remove(link)
   mat.node_tree.nodes.remove(n)
# Legacy Blender materials use Diffuse BSDF nodes that GLTF cannot export.
# Rebuild equivalent PBR nodes, retaining linked source colour textures.
for mat in bpy.data.materials:
    images=[n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if mat.use_nodes else []
    color=tuple(mat.diffuse_color)
    # Architectural finish values in linear space, with original seat atlas.
    if mat.name=='Seat': color=(.08,.21,.36,1)
    elif mat.name in ('Cement','Concret'):color=(.27,.29,.28,1)
    elif mat.name=='Wall':color=(.42,.44,.41,1)
    elif mat.name.startswith('Screen'):color=(.013,.04,.034,1)
    elif mat.name in ('Roof','RoofYransparent'):color=(.64,.68,.66,1)
    elif mat.name=='Grass_001':color=(.035,.12,.048,1)
    mat.use_nodes=True;mat.node_tree.nodes.clear()
    shader=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value=color
    shader.inputs['Roughness'].default_value=.82
    output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
    if images:
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=images[0]
        mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
# The original grass bounds include run-off: derive playable transform from
# measured grass enclosure (including run-off); its centre is (-28.6805, .409, 5.612), long axis Y.
# Keep the 115.5 x 76.5 m grass enclosure around the 105 x 68 m pitch.
# Match keeps its own regulation pitch/goals. Strip embedded inner grass/props.
sx=sy=sz=1.0
transform=Matrix(((0,sy,0,-.409*sy),(-sx,0,0,-28.6805*sx),(0,0,sz,-5.612*sz),(0,0,0,1)))
deps=bpy.context.evaluated_depsgraph_get();meshes=[]
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True);continue
 if o.name in ['Plane.003','Plane.011']:
  bpy.data.objects.remove(o,do_unlink=True);continue
 data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
 world=o.matrix_world.copy();o.modifiers.clear();o.parent=None;o.matrix_world=Matrix.Identity(4);o.data=data;data.transform(transform@world)
 # Some models retain hidden construction geometry; remove only below-grade
 # pieces. Do not erase bowl architecture or seat rows.
 bm=bmesh.new();bm.from_mesh(data)
 dead=[f for f in bm.faces if all(v.co.z < -.5 for v in f.verts) or (abs(f.calc_center_median().x)<53 and abs(f.calc_center_median().y)<34.5 and f.calc_center_median().z<4)]
 bmesh.ops.delete(bm,geom=dead,context='FACES');bm.to_mesh(data);bm.free()
 bpy.context.view_layer.objects.active=o
 if len(data.polygons)>80000:
  dec=o.modifiers.new('Seat topology budget','DECIMATE');dec.ratio=.24;bpy.ops.object.modifier_apply(modifier=dec.name)
 # The roof is preserved in the model, separately named for camera cutaways.
 if o.name=='Plane.022':o.name='StadiumRoof'
 else:o.name='Stadium_'+o.name
 meshes.append(o)
# Join static objects by material at GLTF export (shared material batches).
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_yup=True,export_image_format='JPEG',export_jpeg_quality=85,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'missing_source_textures':sorted(set(missing)),'pitch':[105,68],'source_to_pitch':[list(r) for r in transform]}
out.with_suffix('.json').write_text(json.dumps(report,indent=2));print('STADIUM_READY',report)
