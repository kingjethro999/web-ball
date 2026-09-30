"""Render a Web Ball footballer and representative action poses for review."""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
PLAYER = ROOT / "public/assets/players/footballer.glb"
ACTIONS = ROOT / "public/assets/players/football-actions.glb"
OUTPUT = ROOT / "artifacts/player-qc"


def look_at(obj: bpy.types.Object, point: Vector) -> None:
    obj.rotation_euler = (point - obj.location).to_track_quat("-Z", "Y").to_euler()


def bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return (
        Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners))),
        Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners))),
    )


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.device = "CPU"
    bpy.context.scene.cycles.samples = 4
    bpy.context.scene.render.resolution_x = 240
    bpy.context.scene.render.resolution_y = 300
    bpy.context.scene.render.resolution_percentage = 100
    bpy.context.scene.render.image_settings.file_format = "PNG"
    bpy.context.scene.render.film_transparent = False
    world = bpy.data.worlds.new("QC_World")
    world.color = (0.018, 0.03, 0.032)
    bpy.context.scene.world = world

    bpy.ops.import_scene.gltf(filepath=str(PLAYER))
    player_armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    player_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent != player_armature]
    # Include skinned children regardless of importer parenting details.
    player_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.name != "Icosphere"]

    existing = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ACTIONS))
    action_objects = [obj for obj in bpy.context.scene.objects if obj not in existing]
    action_armature = next(obj for obj in action_objects if obj.type == "ARMATURE")
    for obj in action_objects:
        obj.hide_render = True
    action_armature.hide_render = True

    minimum, maximum = bounds(player_meshes)
    center = (minimum + maximum) * 0.5
    height = maximum.z - minimum.z

    bpy.ops.mesh.primitive_plane_add(size=30, location=(center.x, center.y, minimum.z - 0.015))
    ground = bpy.context.object
    ground_material = bpy.data.materials.new("QC_Grass")
    ground_material.diffuse_color = (0.018, 0.11, 0.055, 1.0)
    ground.data.materials.append(ground_material)

    camera_data = bpy.data.cameras.new("QC_Camera")
    camera = bpy.data.objects.new("QC_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = center + Vector((height * 1.15, -height * 2.8, height * 0.45))
    camera.data.lens = 68
    look_at(camera, center + Vector((0, 0, height * 0.04)))
    bpy.context.scene.camera = camera

    key_data = bpy.data.lights.new("QC_Key", "AREA")
    key_data.energy = 900
    key_data.shape = "DISK"
    key_data.size = height * 2.4
    key = bpy.data.objects.new("QC_Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = center + Vector((-height * 1.4, -height * 1.5, height * 2.2))
    look_at(key, center)

    rim_data = bpy.data.lights.new("QC_Rim", "AREA")
    rim_data.energy = 650
    rim_data.color = (1.0, 0.66, 0.25)
    rim_data.size = height * 1.4
    rim = bpy.data.objects.new("QC_Rim", rim_data)
    bpy.context.collection.objects.link(rim)
    rim.location = center + Vector((height * 1.8, height * 1.0, height * 1.8))
    look_at(rim, center)

    player_armature.animation_data_create()
    samples = {
        "rest": (None, 0.0),
        "idle": ("idle", 0.45),
        "jog": ("jog", 0.32),
        "sprint": ("sprint", 0.28),
        "pass": ("pass", 0.58),
        "shoot": ("shoot", 0.56),
        "lob": ("lob", 0.58),
        "tackle": ("tackle", 0.55),
        "slide": ("slide", 0.58),
        "header": ("header", 0.55),
        "gk_stance": ("gk_stance", 0.45),
        "gk_dive_left": ("gk_dive_left", 0.58),
        "gk_catch": ("gk_catch", 0.35),
        "celebrate": ("celebrate", 0.25),
    }
    if "--" in sys.argv:
        requested = set(sys.argv[sys.argv.index("--") + 1 :])
        if requested:
            samples = {name: sample for name, sample in samples.items() if name in requested}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for label, (action_name, fraction) in samples.items():
        if action_name is None:
            player_armature.animation_data.action = None
            bpy.context.scene.frame_set(0)
        else:
            action = bpy.data.actions.get(action_name)
            if action is None:
                raise RuntimeError(f"Missing animation action: {action_name}")
            player_armature.animation_data.action = action
            if action.slots:
                player_armature.animation_data.action_slot = action.slots[0]
            start, end = action.frame_range
            bpy.context.scene.frame_set(round(start + (end - start) * fraction))
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = str(OUTPUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)
    print(f"WEB_BALL_QC={OUTPUT}")


if __name__ == "__main__":
    main()
