"""Normalize King's supplied footballer and retarget CC0 locomotion.
Source files are never changed. Blender 5.2: -b -P this_file -- SOURCE OUTPUT
"""
import sys, math, json, hashlib
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion
ROOT = Path(__file__).resolve().parents[2]
args = sys.argv[sys.argv.index('--')+1:]
source, out = Path(args[0]).resolve(), Path(args[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
FPS = 60
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=str(source))
old = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
bpy.context.view_layer.update()
# Importer rest transforms differ from the visible skin. Bake the evaluated
# skin and reconstruct the bind skeleton from the actual visible joint frames.
joints = [(p.name, p.parent.name if p.parent else None, old.matrix_world @ p.head, old.matrix_world @ p.tail, (old.matrix_world @ p.matrix).to_quaternion()) for p in old.pose.bones]
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name != 'Icosphere']
deps = bpy.context.evaluated_depsgraph_get()
for o in meshes:
    world = o.matrix_world.copy()
    o.data = bpy.data.meshes.new_from_object(o.evaluated_get(deps), preserve_all_data_layers=True, depsgraph=deps)
    o.modifiers.clear()
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
    o.data.transform(world)
for o in list(bpy.context.scene.objects):
    if o not in meshes:
        bpy.data.objects.remove(o, do_unlink=True)
# The GLB splits one continuous body across two primitives. Decimating those
# pieces independently opens cracks in the shirt, limbs and skin. Weld their
# shared boundaries before simplification; loop UVs retain texture seams.
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.join()
meshes=[bpy.context.object]
bm=bmesh.new();bm.from_mesh(meshes[0].data)
boundaries_before=sum(e.is_boundary for e in bm.edges)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002)
boundaries_after=sum(e.is_boundary for e in bm.edges)
bm.to_mesh(meshes[0].data);bm.free()
rig = bpy.data.objects.new('FootballerRig', bpy.data.armatures.new('FootballerSkeleton'))
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name, parent, head, tail, rot in joints:
    b = rig.data.edit_bones.new(name)
    b.head = head
    b.tail = tail if (tail-head).length > .001 else head + Vector((0,0,.05))
    if name == '_rootJoint': b.tail = head + Vector((0,0,.1))
    if name.startswith(('Head_', 'head_end', 'headfront', 'LeftHand', 'RightHand')):
        b.tail = head + (tail-head).normalized() * .12
    b.align_roll(rot @ Vector((0,0,1)))
    if parent: b.parent = rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for o in meshes:
    bpy.context.view_layer.objects.active = o
    dec = o.modifiers.new('Match topology', 'DECIMATE')
    dec.ratio = .20
    bpy.ops.object.modifier_apply(modifier=dec.name)
    o.parent = rig
    mod = o.modifiers.new('Football skin', 'ARMATURE')
    mod.object = rig
    for p in o.data.polygons: p.use_smooth = True
    for mat in o.data.materials:
        mat.name = 'WB_SuppliedKit'
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Roughness'].default_value = .82
        bsdf.inputs['Metallic'].default_value = 0
        bsdf.inputs['Emission Strength'].default_value = 0
        for link in list(mat.node_tree.links):
            if link.to_socket == bsdf.inputs['Emission Color']: mat.node_tree.links.remove(link)
        bsdf.inputs['Emission Color'].default_value = (0,0,0,1)
for img in bpy.data.images:
    if img.type == 'IMAGE' and img.size[0] > 2048:
        img.scale(2048, 2048)
# Preserve the cloth texture. A vertex mask limits runtime tinting to white
# kit fabric; the skin, hair, boots and red piping retain their source colours.
import numpy as np
for o in meshes:
    mat = o.data.materials[0]
    img = next(n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE')
    px = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
    uv = o.data.uv_layers.active.data
    colors = o.data.color_attributes.new(name='KitMask', type='FLOAT_COLOR', domain='CORNER')
    for loop in o.data.loops:
        v = o.data.vertices[loop.vertex_index].co
        u = uv[loop.index].uv
        rgb = px[int(u.y*(img.size[1]-1)) % img.size[1], int(u.x*(img.size[0]-1)) % img.size[0], :3]
        white = max(0., min(1., (float(min(rgb)/max(.001,max(rgb)))-.88)/.06))
        region = .55 < v.z < 1.44
        mask = white if region else 0.
        back_panel = float(v.y > .015 and abs(v.x) < .18 and 1.03 < v.z < 1.39)
        colors.data[loop.index].color = (mask,back_panel,0,1)
# Separate mesh export makes the animation library small and reusable.
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,*meshes]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'footballer.glb'), export_format='GLB', use_selection=True, export_animations=False, export_yup=True, export_skins=True, export_all_vertex_colors=True, export_image_format='JPEG', export_jpeg_quality=92)
# A second mesh shares the same skeleton/texture/mask for distant match views.
# Save/restore the detailed data so authoring and close-up review use full mesh.
detailed={o:o.data for o in meshes}
for o in meshes:
    o.data=o.data.copy()
    bpy.context.view_layer.objects.active=o
    dec=o.modifiers.new('Distance topology','DECIMATE');dec.ratio=.30
    # Evaluate reduction before skin deformation; bind is still neutral here.
    bpy.ops.object.modifier_move_up(modifier=dec.name)
    bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.export_scene.gltf(filepath=str(out/'footballer-match.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_skins=True,export_all_vertex_colors=True,export_image_format='JPEG',export_jpeg_quality=92)
match_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
for o,data in detailed.items():o.data=data
# Import CC0 cadence. Leg rotations are retargeted in world space; upper-body
# extension and wrist roll are constrained for this supplied body below.
existing = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets-source/quaternius/animations/UAL1_Standard.glb'))
src = next(o for o in bpy.context.scene.objects if o not in existing and o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
    if o not in existing and o != src: bpy.data.objects.remove(o, do_unlink=True)
if src.animation_data:
    for track in src.animation_data.nla_tracks: track.mute=True
mapping = {'Hips_00':'pelvis','Spine02_09':'spine_01','Spine01_010':'spine_02','Spine_011':'spine_03','neck_020':'neck_01','Head_021':'Head'}
for side, suffix, ids in [('Left','l',[1,2,3,4,12,13,14,15]),('Right','r',[5,6,7,8,16,17,18,19])]:
    for part, target, num in zip(['UpLeg','Leg','Foot','ToeBase','Shoulder','Arm','ForeArm','Hand'],['thigh','calf','foot','ball','clavicle','upperarm','lowerarm','hand'],ids):
        mapping[f'{side}{part}_0{num}']=f'{target}_{suffix}'
rest = {b.name:b.matrix_local.copy() for b in rig.data.bones}
srcrest = {b.name:src.matrix_world @ b.matrix_local for b in src.data.bones}
calibration = {}
for t,s in mapping.items():
    if s not in srcrest: continue
    tq, sq = rest[t].to_quaternion(), srcrest[s].to_quaternion()
    align = Quaternion()
    if any(k in t for k in ['UpLeg','Leg_','Arm_','ForeArm','Shoulder']):
        align = (tq@Vector((0,1,0))).rotation_difference(sq@Vector((0,1,0)))
    calibration[t] = sq.inverted() @ align @ tq
rig.animation_data_create()
actions=[]
def begin(name):
    a=bpy.data.actions.new(name);rig.animation_data.action=a
    for p in rig.pose.bones:
        p.rotation_mode='QUATERNION';p.matrix_basis=Matrix.Identity(4)
    return a
def key(frame):
    for p in rig.pose.bones:
        p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name)
        p.keyframe_insert('location',frame=frame,group=p.name)
def global_pose(rotations, shift=Vector((0,0,0))):
    matrices={}
    for b in rig.data.bones:
        p=rig.pose.bones[b.name]
        r=rest[b.name]
        parentmat=matrices[b.parent.name] if b.parent else Matrix.Identity(4)
        parentrest=rest[b.parent.name] if b.parent else Matrix.Identity(4)
        baseline=parentmat @ parentrest.inverted() @ r
        pos=baseline.translation
        if b.name=='Hips_00': pos=pos+shift
        q=rotations.get(b.name,baseline.to_quaternion())
        desired=q.to_matrix().to_4x4();desired.translation=pos
        p.matrix_basis=baseline.inverted() @ desired
        matrices[b.name]=desired
# Track the actual skinned sole, including toes, instead of ankle height.
# This catches hovering caused by changed foot proportions and joint rolls.
sole_points=[];sole_weights=[]
names=[b.name for b in rig.data.bones];bone_index={n:i for i,n in enumerate(names)}
for obj in meshes:
    for v in obj.data.vertices:
        if v.co.z > .14:continue
        weights=np.zeros(len(names),dtype=np.float64)
        memberships=sorted(v.groups,key=lambda g:g.weight,reverse=True)[:4]
        for g in memberships:
            name=obj.vertex_groups[g.group].name
            if name in bone_index:weights[bone_index[name]]=g.weight
        if weights.sum()>.001:
            weights/=weights.sum();sole_weights.append(weights);sole_points.append([*v.co,1])
sole_points=np.array(sole_points);sole_weights=np.array(sole_weights)
def sole_height():
    bpy.context.view_layer.update()
    transforms=np.array([rig.pose.bones[n].matrix@rest[n].inverted() for n in names])
    positions=np.einsum('nb,bij,nj->ni',sole_weights,transforms,sole_points)
    return float(positions[:,2].min())
contact_report={}
for target, source_name in [('idle','Idle_Loop'),('walk','Walk_Loop'),('jog','Jog_Fwd_Loop'),('sprint','Sprint_Loop')]:
    original=bpy.data.actions[source_name]
    src.animation_data.action=original
    src.animation_data.action_slot=original.slots[0]
    a=begin(target)
    start,end=original.frame_range
    count=round(end-start)
    samples=[]
    for f in range(count+1):
        bpy.context.scene.frame_set(int(start+(end-start)*f/count),subframe=(start+(end-start)*f/count)%1)
        bpy.context.view_layer.update()
        # Retain the leg cadence, but constrain upper-body motion anatomically.
        # The stylized source has extreme shoulder extension and incompatible
        # wrist rolls. Copying those world orientations dislocates this mesh.
        qs={t:(src.matrix_world@src.pose.bones[s].matrix).to_quaternion()@calibration[t] for t,s in mapping.items() if t in calibration and any(k in t for k in ['UpLeg','Leg_','Foot_','ToeBase'])}
        lean={'idle':0,'walk':2,'jog':7,'sprint':12}[target]
        body=Quaternion((1,0,0),math.radians(lean))
        for name in ['Hips_00','Spine02_09','Spine01_010','Spine_011','LeftShoulder_012','RightShoulder_016','neck_020']:
            qs[name]=body@rest[name].to_quaternion()
        qs['Head_021']=Quaternion((1,0,0),math.radians(lean*.25))@rest['Head_021'].to_quaternion()
        for side,suffix,arm,fore,hand in [('Left','l','LeftArm_013','LeftForeArm_014','LeftHand_015'),('Right','r','RightArm_017','RightForeArm_018','RightHand_019')]:
            thigh=src.pose.bones['thigh_'+suffix]
            direction=(src.matrix_world.to_3x3()@(thigh.tail-thigh.head)).normalized()
            limit={'idle':0,'walk':18,'jog':32,'sprint':40}[target]
            swing=max(-limit,min(limit,-math.degrees(math.atan2(direction.y,-direction.z))*.65))
            elbow={'idle':8,'walk':18,'jog':78,'sprint':88}[target]
            spread=-7 if side=='Left' else 7
            upper=body@Quaternion((1,0,0),math.radians(swing))@Quaternion((0,1,0),math.radians(spread))
            lower=upper@Quaternion((1,0,0),math.radians(-elbow))
            qs[arm]=upper@rest[arm].to_quaternion()
            qs[fore]=lower@rest[fore].to_quaternion()
            # Keep the supplied neutral wrist relative to the forearm.
            qs[hand]=lower@rest[hand].to_quaternion()
        shift=(src.matrix_world@src.pose.bones['pelvis'].head)-srcrest['pelvis'].translation
        shift.x*=.25;shift.y=0
        global_pose(qs,shift)
        samples.append((qs,shift.copy(),sole_height()))
    floor=min(sample[2] for sample in samples)
    heights=[]
    for f,(qs,shift,height) in enumerate(samples):
        # Walk/idle retain contact. Running retains the source flight phases,
        # with 3 cm of retarget error removed around support-foot contact.
        target_height=0 if target in ['idle','walk'] else max(0,height-floor-.03)
        shift.z+=target_height-height+.003
        global_pose(qs,shift)
        key(f+1);heights.append(sole_height())
    contact_report[target]={'minimum_sole_height':min(heights),'maximum_sole_height':max(heights),'contact_samples':sum(h<.008 for h in heights),'samples':len(heights)}
    actions.append(a)
# Football motions use rotations around anatomical WORLD axes. The source
# bind pose is an arms-down stance, not the CC0 mannequin's T pose.
def authored(name, duration, frames):
    a=begin(name)
    for phase, rotations, shift in frames:
        for p in rig.pose.bones:
            p.matrix_basis=Matrix.Identity(4)
            values=rotations.get(p.name,(0,0,0))
            world=Quaternion((0,0,1),math.radians(values[2]))@Quaternion((0,1,0),math.radians(values[1]))@Quaternion((1,0,0),math.radians(values[0]))
            q=rest[p.name].to_quaternion()
            p.rotation_quaternion=q.inverted()@world@q
        hip=rig.pose.bones['Hips_00'];hip.location=rest['Hips_00'].to_quaternion().inverted()@Vector(shift)
        if name in ['pass','shoot','lob','gk_punt','turn','tackle','gk_stance','gk_catch','referee_signal','dejected']:
            height=sole_height()
            hip.location += rest['Hips_00'].to_quaternion().inverted() @ Vector((0,0,.003-height))
        key(1+round(phase*duration*FPS))
    actions.append(a)
neutral=(0,{},(0,0,0));end=(1,{},(0,0,0))
L='Left';R='Right'
for name,strength in [('pass',.6),('shoot',1),('lob',.75),('gk_punt',.95)]:
    authored(name,.9,[neutral,(.3,{'RightUpLeg_05':(35*strength,0,0),'RightLeg_06':(65*strength,0,0),'LeftArm_013':(-18,0,-12),'RightArm_017':(22,0,15),'Spine_011':(4,0,-8)},(0,0,-.025)),(.55,{'RightUpLeg_05':(-65*strength,0,-8),'RightLeg_06':(12,0,0),'LeftArm_013':(-15,-30,0),'RightArm_017':(15,24,0),'LeftForeArm_014':(-25,0,0),'RightForeArm_018':(-25,0,0),'Spine_011':(-8,0,12)},(0,0,0)),end])
authored('turn',.5,[neutral,(.5,{'Hips_00':(0,0,22),'Spine_011':(0,0,-14)},(0,0,-.02)),end])
authored('tackle',.65,[neutral,(.45,{'RightUpLeg_05':(-40,0,-8),'RightLeg_06':(15,0,0),'LeftUpLeg_01':(-20,0,0),'LeftLeg_02':(35,0,0),'Spine_011':(15,0,0),'LeftArm_013':(0,-22,0),'RightArm_017':(0,22,0)},(0,0,-.1)),end])
slide_pose={'Hips_00':(-65,0,0),'Spine_011':(15,0,0),'LeftUpLeg_01':(-90,0,-12),'LeftLeg_02':(145,0,0),'LeftFoot_03':(-20,0,0),'RightUpLeg_05':(-30,0,0),'RightLeg_06':(0,0,0),'RightFoot_07':(95,0,0),'LeftArm_013':(55,-35,0),'LeftForeArm_014':(-90,0,0),'RightArm_017':(55,35,0),'RightForeArm_018':(-65,0,0)}
authored('slide',1.2,[neutral,(.25,slide_pose,(0,0,-.85)),(.65,slide_pose,(0,0,-.87)),end])
authored('header',.85,[neutral,(.4,{'Spine_011':(-15,0,0),'LeftArm_013':(-25,-25,0),'RightArm_017':(-25,25,0)},(0,0,.18)),(.6,{'Spine_011':(20,0,0),'Head_021':(15,0,0)},(0,-.05,.13)),end])
stance={'LeftUpLeg_01':(-25,-8,0),'RightUpLeg_05':(-25,8,0),'LeftLeg_02':(48,0,0),'RightLeg_06':(48,0,0),'Spine_011':(12,0,0),'LeftArm_013':(-15,-20,0),'RightArm_017':(-15,20,0),'LeftForeArm_014':(-40,0,0),'RightForeArm_018':(-40,0,0)}
authored('gk_stance',2,[(0,stance,(0,0,-.09)),(.5,stance,(0,0,-.1)),(1,stance,(0,0,-.09))])
for name,side in [('gk_dive_left',1),('gk_dive_right',-1)]:
    pose={'Hips_00':(0,side*80,0),'LeftArm_013':(0,-170,0),'RightArm_017':(0,170,0),'LeftForeArm_014':(-15,0,0),'RightForeArm_018':(-15,0,0),'LeftLeg_02':(25,0,0),'RightLeg_06':(45,0,0)}
    authored(name,1.2,[(0,stance,(0,0,-.09)),(.35,pose,(side*.35,0,-.15)),(.65,pose,(side*.7,0,-.65)),(1,stance,(0,0,-.09))])
authored('gk_catch',1.1,[neutral,(.4,{'LeftArm_013':(-135,0,0),'RightArm_017':(-135,0,0),'LeftForeArm_014':(-15,0,0),'RightForeArm_018':(-15,0,0)},(0,0,.05)),(.7,{'LeftArm_013':(-45,0,0),'RightArm_017':(-45,0,0),'LeftForeArm_014':(-80,0,0),'RightForeArm_018':(-80,0,0)},(0,0,0)),end])
raised={'LeftArm_013':(0,-155,0),'RightArm_017':(0,155,0),'LeftForeArm_014':(-15,0,0),'RightForeArm_018':(-15,0,0)}
authored('celebrate',2,[(0,raised,(0,0,0)),(.5,raised,(0,0,.045)),(1,raised,(0,0,0))])
authored('dejected',2,[(0,{'Head_021':(20,0,0),'Spine_011':(8,0,0)},(0,0,0)),(1,{'Head_021':(20,0,0),'Spine_011':(8,0,0)},(0,0,0))])
authored('referee_signal',1.5,[neutral,(.25,{'RightArm_017':(0,90,0)},(0,0,0)),(.75,{'RightArm_017':(0,90,0)},(0,0,0)),end])
# Check every exported frame of the dives and slide against the entire skin.
# Feet-only checks miss a knee, hip, elbow or head passing through the pitch.
body_points=[];body_indices=[];body_weights=[]
for obj in meshes:
    for v in obj.data.vertices:
        groups=sorted(v.groups,key=lambda g:g.weight,reverse=True)[:4]
        indices=[];weights=[]
        for g in groups:
            name=obj.vertex_groups[g.group].name
            if name in bone_index:indices.append(bone_index[name]);weights.append(g.weight)
        if not weights:continue
        while len(indices)<4:indices.append(0);weights.append(0)
        total=sum(weights);body_points.append([*v.co,1]);body_indices.append(indices);body_weights.append([w/total for w in weights])
body_points=np.array(body_points);body_indices=np.array(body_indices);body_weights=np.array(body_weights)
def body_floor():
    bpy.context.view_layer.update()
    matrices=np.array([rig.pose.bones[n].matrix@rest[n].inverted() for n in names])
    positions=np.einsum('nkij,nj,nk->ni',matrices[body_indices],body_points,body_weights,optimize=True)
    return float(positions[:,2].min())
for a in actions:
    if a.name not in ['gk_dive_left','gk_dive_right','slide']:continue
    rig.animation_data.action=a
    corrections=[]
    for frame in range(int(a.frame_range[0]),int(a.frame_range[1])+1):
        bpy.context.scene.frame_set(frame)
        height=body_floor()
        corrections.append((frame,rig.pose.bones['Hips_00'].location.copy(),max(0,.006-height)))
    for frame,location,lift in corrections:
        hip=rig.pose.bones['Hips_00']
        hip.location=location+rest['Hips_00'].to_quaternion().inverted()@Vector((0,0,lift))
        hip.keyframe_insert('location',frame=frame,group=hip.name)
    contact_report[a.name]={'corrected_frames':sum(lift>.001 for _,_,lift in corrections),'frames':len(corrections)}
rig.animation_data.action=None
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
bpy.data.objects.remove(src,do_unlink=True)
for a in list(bpy.data.actions):
    if a not in actions:bpy.data.actions.remove(a)
for a in actions:
    tr=rig.animation_data.nla_tracks.new();tr.name=a.name;tr.strips.new(a.name,1,a);tr.mute=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'artifacts/supplied-review/footballer.blend'))
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'football-actions.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_yup=True)
receipt={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'match_triangles':match_triangles,'bones':len(rig.data.bones),'animations':[a.name for a in actions],'foot_contact':contact_report,'boundary_edges_before_weld':boundaries_before,'boundary_edges_after_weld':boundaries_after}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2))
print('SUPPLIED_PLAYER_READY',receipt)
