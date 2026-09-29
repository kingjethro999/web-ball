# M1 asset handoff — not a finished football character

## Already included

The official FREE Standard archives were obtained on 2026-09-28. Their included licenses explicitly say CC0 1.0. A selected male humanoid and all of its referenced textures/buffer, plus the no-root-motion animation GLB, are included under `assets-source/quaternius/`. They are source assets, not runtime assets; the current renderer does not load them. Do not present the legacy characters as this model.

- `assets-source/quaternius/base-character/Superhero_Male_FullBody.gltf`
- Adjacent `.bin` and all seven image dependencies, plus `LICENSE.txt`.
- `assets-source/quaternius/animations/UAL1_Standard.glb`
- Adjacent `LICENSE.txt` and the author's `README.txt`.
- `assets-source/quaternius/inventory.json`: exact available animation names and SHA-256 hashes.

The inspected character has three meshes, a humanoid skin/skeleton, and **no embedded animations**. The free character selection is the Superhero body, not the Regular body advertised for the larger paid pack. The free animation GLB has 43 clips including `Idle_Loop`, `Jog_Fwd_Loop`, and `Sprint_Loop`. It has **no football passes, shots, crosses, tackles, headers, or keeper actions**. Do not use gun/sword/combat motions and claim they are football animations. The base character also needs an actual football kit adaptation; it is not a ready-made dressed footballer.

## Exact downloads if you want the complete original archives

1. https://quaternius.itch.io/universal-base-characters — Download Now → No thanks, just take me to the downloads → **Universal Base Characters[Standard].zip** (122 MB).
2. https://quaternius.itch.io/universal-animation-library — same free route → **Universal Animation Library[Standard].zip** (15 MB).

Put those archives in `assets-source/downloads/` and preserve original folder names when extracting. The relevant original files are:

- `Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf` and all files it references.
- `Universal Base Characters[Standard]/License_Standard.txt`.
- `Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb` (without `_RM`, to let the simulation own movement).
- `Universal Animation Library[Standard]/License.txt`.

You do **not** need to redownload these for the selected assets already in this handoff. No paid files or Mixamo downloads are included. The vendor GLTF references `T_Hair_1_Normal_png.png` and `T_Eye_Normal_png.png`, while its archive stores those textures without `_png`. This handoff copies the supplied matching textures under the referenced names so the GLTF dependencies resolve; no replacement artwork is invented.

## Remaining asset requirement / stopping point

A suitable complete football character package has not been obtained. Before replacing the active renderer, adapt the licensed humanoid with rigged shirt/shorts/socks/boots and author or source football and goalkeeper animations. No verified free download covering that full set was found in the inspected packs. It would be dishonest to give an invented download filename for those missing clips.

The following are **project export destinations**, not claimed vendor download filenames:

- `public/assets/players/footballer.glb`: skinned human, working skeleton, named kit material slots, skin/hair customization, metrically consistent scale and orientation.
- `public/assets/players/football-actions.glb`: idle, jog, sprint, turn, pass, shoot, lob/cross, tackle, slide, header, celebrate, dejected, GK stance/dive/catch/punt and referee actions.
- `public/assets/players/LICENSE.txt`: preserve every applicable license and creator credit.

Local Codex should first inspect the included GLTF in a GPU browser or Blender. Build the footballer adaptation from those human meshes; never rebuild a body from primitives. Validate bone naming/rest pose before reusing animation tracks; clone skeletons per player, share immutable meshes/textures, blend clips, and use a football-specific animation/event contract driven by the engine. Do not assume shared skeleton instances can have independent poses. Add foot planting and intentional contact timing, rather than merely moving the ball at an arbitrary pose.

M1 must stay incomplete until close-up characters, kit variation, ball actions and all six cameras have actually been viewed and checked. The download browser timed out during this run; shell download succeeded, but new GPU visual verification did not.
