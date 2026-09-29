"""Inspect imported character and animation assets with Blender.

Usage:
  blender -b -P tools/blender/inspect_character.py -- path/to/asset.gltf
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


def asset_path() -> Path:
    try:
        marker = sys.argv.index("--")
        return Path(sys.argv[marker + 1]).resolve()
    except (ValueError, IndexError) as exc:
        raise SystemExit("Expected an asset path after --") from exc


def main() -> None:
    source = asset_path()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))

    armatures = []
    meshes = []
    for obj in bpy.context.scene.objects:
        if obj.type == "ARMATURE":
            armatures.append(
                {
                    "name": obj.name,
                    "bones": [bone.name for bone in obj.data.bones],
                }
            )
        elif obj.type == "MESH":
            meshes.append(
                {
                    "name": obj.name,
                    "vertices": len(obj.data.vertices),
                    "triangles": sum(len(poly.vertices) - 2 for poly in obj.data.polygons),
                    "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                    "vertex_groups": [group.name for group in obj.vertex_groups],
                }
            )

    actions = []
    for action in bpy.data.actions:
        frame_range = action.frame_range
        actions.append(
            {
                "name": action.name,
                "frames": [float(frame_range[0]), float(frame_range[1])],
                "slots": len(action.slots),
            }
        )

    print(
        "WEB_BALL_ASSET_INSPECTION="
        + json.dumps(
            {
                "source": str(source),
                "armatures": armatures,
                "meshes": meshes,
                "actions": actions,
            },
            separators=(",", ":"),
        )
    )


if __name__ == "__main__":
    main()
