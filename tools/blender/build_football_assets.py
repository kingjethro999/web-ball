"""Build Web Ball's licensed footballer and football animation GLBs.

The script keeps Quaternius' CC0 skinned human mesh and universal skeleton,
replaces the superhero surface with named football-kit materials, reuses the
licensed locomotion clips, and authors football-specific actions on the same
skeleton. Run from the repository root:

  blender -b -P tools/blender/build_football_assets.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets-source/quaternius/base-character/Superhero_Male_FullBody.gltf"
LOCOMOTION = ROOT / "assets-source/quaternius/animations/UAL1_Standard.glb"
OUTPUT = ROOT / "public/assets/players"


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.72):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = 0.0
    return mat


def dominant_bone(mesh: bpy.types.Object, polygon: bpy.types.MeshPolygon) -> str:
    totals: dict[str, float] = {}
    for vertex_index in polygon.vertices:
        vertex = mesh.data.vertices[vertex_index]
        for membership in vertex.groups:
            name = mesh.vertex_groups[membership.group].name
            totals[name] = totals.get(name, 0.0) + membership.weight
    return max(totals, key=totals.get, default="")


def dress_footballer() -> None:
    palette = {
        "WB_Shirt": material("WB_Shirt", (0.04, 0.42, 0.20, 1.0)),
        "WB_Shorts": material("WB_Shorts", (0.025, 0.05, 0.06, 1.0)),
        "WB_Socks": material("WB_Socks", (0.95, 0.67, 0.12, 1.0)),
        "WB_Boots": material("WB_Boots", (0.025, 0.028, 0.03, 1.0), 0.5),
        "WB_Skin": material("WB_Skin", (0.48, 0.24, 0.13, 1.0), 0.82),
        "WB_Hair": material("WB_Hair", (0.025, 0.018, 0.014, 1.0), 0.88),
        "WB_Eyes": material("WB_Eyes", (0.06, 0.045, 0.035, 1.0), 0.62),
    }

    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        if obj.name == "Icosphere":
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        obj.data.materials.clear()
        if obj.name == "Eyes":
            obj.data.materials.append(palette["WB_Eyes"])
            continue
        if obj.name == "Eyebrows":
            obj.data.materials.append(palette["WB_Hair"])
            continue

        ordered = ["WB_Shirt", "WB_Shorts", "WB_Socks", "WB_Boots", "WB_Skin"]
        for name in ordered:
            obj.data.materials.append(palette[name])
        indices = {name: index for index, name in enumerate(ordered)}

        for polygon in obj.data.polygons:
            bone = dominant_bone(obj, polygon)
            if bone.startswith(("Head", "neck", "hand", "index", "middle", "ring", "pinky", "thumb")):
                region = "WB_Skin"
            elif bone.startswith(("foot", "ball")):
                region = "WB_Boots"
            elif bone.startswith("calf"):
                region = "WB_Socks"
            elif bone.startswith(("pelvis", "thigh")):
                region = "WB_Shorts"
            elif bone.startswith("lowerarm"):
                region = "WB_Skin"
            else:
                region = "WB_Shirt"
            polygon.material_index = indices[region]


def export_footballer() -> None:
    reset()
    bpy.ops.import_scene.gltf(filepath=str(BASE))
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    armature.name = "FootballerRig"
    dress_footballer()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "footballer.glb"),
        export_format="GLB",
        export_animations=False,
        export_yup=True,
        export_skins=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_apply=False,
    )


def degrees(values: tuple[float, float, float]):
    return tuple(math.radians(value) for value in values)


def create_action(
    armature: bpy.types.Object,
    name: str,
    frames: list[tuple[int, dict[str, tuple[float, float, float]], dict[str, tuple[float, float, float]]]],
    cyclic: bool = False,
) -> bpy.types.Action:
    action = bpy.data.actions.new(name=name)
    armature.animation_data_create()
    armature.animation_data.action = action

    for frame, rotations, locations in frames:
        for bone in armature.pose.bones:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (0.0, 0.0, 0.0)
            bone.location = (0.0, 0.0, 0.0)
            bone.scale = (1.0, 1.0, 1.0)
        for bone_name, rotation in rotations.items():
            armature.pose.bones[bone_name].rotation_euler = degrees(rotation)
        for bone_name, location in locations.items():
            armature.pose.bones[bone_name].location = location
        for bone in armature.pose.bones:
            bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
            bone.keyframe_insert("location", frame=frame, group=bone.name)

    action.frame_start = frames[0][0]
    action.frame_end = frames[-1][0]
    # Looping clips have matching first/last poses. Blender 5's layered action
    # API no longer exposes legacy action.fcurves for adding cycle modifiers,
    # and glTF carries the sampled loop cleanly without one.
    armature.animation_data.action = None
    return action


def football_actions(armature: bpy.types.Object) -> list[bpy.types.Action]:
    neutral = ({}, {})
    specs = [
        ("turn", [(1, *neutral), (8, {"pelvis": (0, 0, -28), "spine_02": (0, 0, 22), "Head": (0, 0, 18)}, {}), (16, *neutral)], False),
        ("pass", [(1, *neutral), (8, {"spine_02": (7, 0, -9), "thigh_r": (-30, 0, 0), "calf_r": (42, 0, 0), "upperarm_l": (8, 0, -28), "upperarm_r": (-8, 0, 24)}, {}), (13, {"spine_02": (-8, 0, 12), "thigh_r": (52, 0, 0), "calf_r": (-18, 0, 0), "thigh_l": (-8, 0, 0), "upperarm_l": (-12, 0, 30), "upperarm_r": (12, 0, -34)}, {}), (22, *neutral)], False),
        ("shoot", [(1, *neutral), (10, {"pelvis": (0, 0, -12), "spine_02": (12, 0, 10), "thigh_r": (-52, 0, 0), "calf_r": (68, 0, 0), "upperarm_l": (-18, 0, 44), "upperarm_r": (20, 0, -48)}, {}), (16, {"pelvis": (0, 0, 16), "spine_02": (-22, 0, -12), "thigh_r": (72, 0, 0), "calf_r": (-28, 0, 0), "thigh_l": (-12, 0, 0), "upperarm_l": (24, 0, -48), "upperarm_r": (-24, 0, 54)}, {}), (30, *neutral)], False),
        ("lob", [(1, *neutral), (9, {"spine_02": (-10, 0, 0), "thigh_r": (-35, 0, 0), "calf_r": (46, 0, 0), "upperarm_l": (-6, 0, -25), "upperarm_r": (6, 0, 25)}, {}), (15, {"spine_02": (14, 0, 0), "thigh_r": (48, 0, 0), "calf_r": (-8, 0, 0), "foot_r": (-24, 0, 0)}, {}), (26, *neutral)], False),
        ("tackle", [(1, *neutral), (8, {"spine_02": (18, 0, 0), "thigh_r": (48, 0, -12), "calf_r": (-18, 0, 0), "thigh_l": (-25, 0, 0), "upperarm_l": (-20, 0, 36), "upperarm_r": (20, 0, -36)}, {"pelvis": (0, 0, -0.12)}), (17, *neutral)], False),
        ("slide", [(1, *neutral), (10, {"pelvis": (62, 0, 0), "spine_02": (-28, 0, 0), "thigh_l": (-40, 0, 0), "calf_l": (34, 0, 0), "thigh_r": (20, 0, 0), "upperarm_l": (-12, 0, 60), "upperarm_r": (12, 0, -55)}, {"pelvis": (0, 0.18, -0.62)}), (22, {"pelvis": (72, 0, 0), "spine_02": (-18, 0, 0), "thigh_l": (-20, 0, 0), "thigh_r": (10, 0, 0)}, {"pelvis": (0, 0.32, -0.72)}), (36, *neutral)], False),
        ("header", [(1, *neutral), (9, {"spine_02": (-22, 0, 0), "neck_01": (14, 0, 0), "upperarm_l": (-18, 0, 30), "upperarm_r": (18, 0, -30)}, {"pelvis": (0, 0, 0.06)}), (14, {"spine_02": (34, 0, 0), "neck_01": (-24, 0, 0), "Head": (-14, 0, 0), "upperarm_l": (22, 0, -36), "upperarm_r": (-22, 0, 36)}, {"pelvis": (0, 0, 0.12)}), (24, *neutral)], False),
        ("celebrate", [(1, *neutral), (12, {"upperarm_l": (0, -18, -145), "lowerarm_l": (0, 0, -25), "upperarm_r": (0, 18, 145), "lowerarm_r": (0, 0, 25), "spine_02": (-8, 0, 0), "Head": (-12, 0, 0)}, {"pelvis": (0, 0, 0.1)}), (28, {"upperarm_l": (0, -18, -145), "upperarm_r": (0, 18, 145), "spine_02": (0, 0, -12)}, {"pelvis": (0, 0, 0.02)}), (44, {"upperarm_l": (0, -18, -145), "upperarm_r": (0, 18, 145), "spine_02": (0, 0, 12)}, {"pelvis": (0, 0, 0.1)}), (60, {"upperarm_l": (0, -18, -145), "upperarm_r": (0, 18, 145), "spine_02": (0, 0, -12)}, {"pelvis": (0, 0, 0.02)})], True),
        ("dejected", [(1, *neutral), (16, {"spine_02": (18, 0, 0), "neck_01": (18, 0, 0), "Head": (20, 0, 0), "upperarm_l": (8, 0, -8), "upperarm_r": (-8, 0, 8)}, {}), (60, {"spine_02": (18, 0, 0), "neck_01": (18, 0, 0), "Head": (20, 0, 0), "upperarm_l": (8, 0, -8), "upperarm_r": (-8, 0, 8)}, {})], True),
        ("gk_stance", [(1, {"pelvis": (12, 0, 0), "spine_02": (14, 0, 0), "thigh_l": (-18, 0, -12), "thigh_r": (-18, 0, 12), "calf_l": (28, 0, 0), "calf_r": (28, 0, 0), "upperarm_l": (12, -10, -48), "upperarm_r": (-12, 10, 48), "lowerarm_l": (-35, 0, -18), "lowerarm_r": (-35, 0, 18)}, {"pelvis": (0, 0, -0.08)}), (30, {"pelvis": (15, 0, 0), "spine_02": (11, 0, 0), "thigh_l": (-16, 0, -12), "thigh_r": (-16, 0, 12), "calf_l": (25, 0, 0), "calf_r": (25, 0, 0), "upperarm_l": (10, -10, -46), "upperarm_r": (-10, 10, 46), "lowerarm_l": (-32, 0, -18), "lowerarm_r": (-32, 0, 18)}, {"pelvis": (0, 0, -0.1)}), (60, {"pelvis": (12, 0, 0), "spine_02": (14, 0, 0), "thigh_l": (-18, 0, -12), "thigh_r": (-18, 0, 12), "calf_l": (28, 0, 0), "calf_r": (28, 0, 0), "upperarm_l": (12, -10, -48), "upperarm_r": (-12, 10, 48), "lowerarm_l": (-35, 0, -18), "lowerarm_r": (-35, 0, 18)}, {"pelvis": (0, 0, -0.08)})], True),
        ("gk_dive_left", [(1, *neutral), (9, {"pelvis": (22, 0, 12), "spine_02": (-10, 0, -12), "upperarm_l": (0, -8, -110), "upperarm_r": (0, 8, -75), "lowerarm_l": (0, 0, -20)}, {"pelvis": (-0.22, 0, 0.08)}), (18, {"pelvis": (82, 0, 16), "spine_02": (-18, 0, -10), "upperarm_l": (0, -8, -150), "upperarm_r": (0, 8, -125), "thigh_l": (-24, 0, 0), "thigh_r": (18, 0, 0)}, {"pelvis": (-0.88, 0.12, 0.38)}), (34, {"pelvis": (88, 0, 12), "upperarm_l": (0, -8, -150), "upperarm_r": (0, 8, -125)}, {"pelvis": (-1.05, 0.2, -0.25)})], False),
        ("gk_dive_right", [(1, *neutral), (9, {"pelvis": (-22, 0, -12), "spine_02": (-10, 0, 12), "upperarm_l": (0, -8, 75), "upperarm_r": (0, 8, 110), "lowerarm_r": (0, 0, 20)}, {"pelvis": (0.22, 0, 0.08)}), (18, {"pelvis": (-82, 0, -16), "spine_02": (-18, 0, 10), "upperarm_l": (0, -8, 125), "upperarm_r": (0, 8, 150), "thigh_l": (18, 0, 0), "thigh_r": (-24, 0, 0)}, {"pelvis": (0.88, 0.12, 0.38)}), (34, {"pelvis": (-88, 0, -12), "upperarm_l": (0, -8, 125), "upperarm_r": (0, 8, 150)}, {"pelvis": (1.05, 0.2, -0.25)})], False),
        ("gk_catch", [(1, *neutral), (10, {"spine_02": (-12, 0, 0), "upperarm_l": (0, -22, -125), "upperarm_r": (0, 22, 125), "lowerarm_l": (-18, 0, -24), "lowerarm_r": (-18, 0, 24), "Head": (-10, 0, 0)}, {}), (22, {"upperarm_l": (0, -12, -82), "upperarm_r": (0, 12, 82), "lowerarm_l": (-42, 0, -12), "lowerarm_r": (-42, 0, 12)}, {}), (34, *neutral)], False),
        ("gk_punt", [(1, *neutral), (10, {"upperarm_l": (-22, 0, -32), "lowerarm_l": (-60, 0, 0), "thigh_r": (-26, 0, 0), "calf_r": (32, 0, 0)}, {}), (18, {"spine_02": (-8, 0, 8), "thigh_r": (65, 0, 0), "calf_r": (-18, 0, 0), "upperarm_l": (18, 0, 30), "upperarm_r": (-18, 0, -30)}, {}), (32, *neutral)], False),
        ("referee_signal", [(1, *neutral), (12, {"upperarm_r": (0, 12, 92), "lowerarm_r": (0, 0, 8), "spine_02": (0, 0, -8), "Head": (0, 0, -12)}, {}), (38, {"upperarm_r": (0, 12, 92), "lowerarm_r": (0, 0, 8), "spine_02": (0, 0, -8), "Head": (0, 0, -12)}, {}), (48, *neutral)], False),
    ]
    return [create_action(armature, name, frames, cyclic) for name, frames, cyclic in specs]


def locomotion_actions(armature: bpy.types.Object) -> list[bpy.types.Action]:
    neutral_arms = {
        "upperarm_l": (4, 0, -66),
        "upperarm_r": (-4, 0, 66),
        "lowerarm_l": (-8, 0, -5),
        "lowerarm_r": (-8, 0, 5),
    }
    idle_a = {**neutral_arms, "spine_02": (-2, 0, 0), "Head": (1, 0, 0)}
    idle_b = {**neutral_arms, "spine_02": (2, 0, 0), "Head": (-1, 0, 0)}
    specs = [
        ("idle", [(1, idle_a, {}), (30, idle_b, {"pelvis": (0, 0, 0.012)}), (60, idle_a, {})], True),
        ("walk", [(1, {**neutral_arms, "thigh_l": (24, 0, 0), "calf_l": (-8, 0, 0), "thigh_r": (-24, 0, 0), "calf_r": (28, 0, 0), "upperarm_l": (-18, 0, -62), "upperarm_r": (18, 0, 62)}, {}), (9, {**neutral_arms, "thigh_l": (0, 0, 0), "calf_l": (18, 0, 0), "thigh_r": (0, 0, 0), "calf_r": (4, 0, 0)}, {"pelvis": (0, 0, 0.025)}), (17, {**neutral_arms, "thigh_l": (-24, 0, 0), "calf_l": (28, 0, 0), "thigh_r": (24, 0, 0), "calf_r": (-8, 0, 0), "upperarm_l": (18, 0, -62), "upperarm_r": (-18, 0, 62)}, {}), (25, {**neutral_arms, "thigh_l": (0, 0, 0), "calf_l": (4, 0, 0), "thigh_r": (0, 0, 0), "calf_r": (18, 0, 0)}, {"pelvis": (0, 0, 0.025)}), (33, {**neutral_arms, "thigh_l": (24, 0, 0), "calf_l": (-8, 0, 0), "thigh_r": (-24, 0, 0), "calf_r": (28, 0, 0), "upperarm_l": (-18, 0, -62), "upperarm_r": (18, 0, 62)}, {})], True),
        ("jog", [(1, {**neutral_arms, "spine_02": (8, 0, 0), "thigh_l": (38, 0, 0), "calf_l": (-12, 0, 0), "thigh_r": (-34, 0, 0), "calf_r": (52, 0, 0), "upperarm_l": (-32, 0, -58), "upperarm_r": (34, 0, 58)}, {"pelvis": (0, 0, 0.02)}), (7, {**neutral_arms, "spine_02": (10, 0, 0), "thigh_l": (0, 0, 0), "calf_l": (32, 0, 0), "thigh_r": (0, 0, 0), "calf_r": (12, 0, 0)}, {"pelvis": (0, 0, 0.075)}), (13, {**neutral_arms, "spine_02": (8, 0, 0), "thigh_l": (-34, 0, 0), "calf_l": (52, 0, 0), "thigh_r": (38, 0, 0), "calf_r": (-12, 0, 0), "upperarm_l": (34, 0, -58), "upperarm_r": (-32, 0, 58)}, {"pelvis": (0, 0, 0.02)}), (19, {**neutral_arms, "spine_02": (10, 0, 0), "thigh_l": (0, 0, 0), "calf_l": (12, 0, 0), "thigh_r": (0, 0, 0), "calf_r": (32, 0, 0)}, {"pelvis": (0, 0, 0.075)}), (25, {**neutral_arms, "spine_02": (8, 0, 0), "thigh_l": (38, 0, 0), "calf_l": (-12, 0, 0), "thigh_r": (-34, 0, 0), "calf_r": (52, 0, 0), "upperarm_l": (-32, 0, -58), "upperarm_r": (34, 0, 58)}, {"pelvis": (0, 0, 0.02)})], True),
        ("sprint", [(1, {**neutral_arms, "spine_02": (17, 0, 0), "thigh_l": (54, 0, 0), "calf_l": (-18, 0, 0), "thigh_r": (-48, 0, 0), "calf_r": (68, 0, 0), "upperarm_l": (-48, 0, -52), "upperarm_r": (50, 0, 52)}, {"pelvis": (0, 0, 0.04)}), (5, {**neutral_arms, "spine_02": (20, 0, 0), "thigh_l": (0, 0, 0), "calf_l": (42, 0, 0), "thigh_r": (0, 0, 0), "calf_r": (18, 0, 0)}, {"pelvis": (0, 0, 0.13)}), (9, {**neutral_arms, "spine_02": (17, 0, 0), "thigh_l": (-48, 0, 0), "calf_l": (68, 0, 0), "thigh_r": (54, 0, 0), "calf_r": (-18, 0, 0), "upperarm_l": (50, 0, -52), "upperarm_r": (-48, 0, 52)}, {"pelvis": (0, 0, 0.04)}), (13, {**neutral_arms, "spine_02": (20, 0, 0), "thigh_l": (0, 0, 0), "calf_l": (18, 0, 0), "thigh_r": (0, 0, 0), "calf_r": (42, 0, 0)}, {"pelvis": (0, 0, 0.13)}), (17, {**neutral_arms, "spine_02": (17, 0, 0), "thigh_l": (54, 0, 0), "calf_l": (-18, 0, 0), "thigh_r": (-48, 0, 0), "calf_r": (68, 0, 0), "upperarm_l": (-48, 0, -52), "upperarm_r": (50, 0, 52)}, {"pelvis": (0, 0, 0.04)})], True),
    ]
    return [create_action(armature, name, frames, cyclic) for name, frames, cyclic in specs]


def export_actions() -> None:
    reset()
    bpy.ops.import_scene.gltf(filepath=str(LOCOMOTION))
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    armature.name = "FootballerRig"

    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    actions = locomotion_actions(armature)
    actions.extend(football_actions(armature))

    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    armature.animation_data_create()
    armature.animation_data.action = None
    armature.animation_data_clear()
    armature.animation_data_create()
    for action in actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        track.strips.new(action.name, int(action.frame_range[0]), action)

    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "football-actions.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_force_sampling=True,
        export_def_bones=True,
        export_leaf_bone=False,
        export_yup=True,
        export_skins=True,
        export_apply=False,
        export_optimize_animation_size=True,
    )


def main() -> None:
    export_footballer()
    export_actions()
    print(f"WEB_BALL_ASSETS={OUTPUT / 'footballer.glb'},{OUTPUT / 'football-actions.glb'}")


if __name__ == "__main__":
    main()
