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

## Current supplied-asset pipeline (2026-09-30)

The active runtime now uses `public/assets/supplied/footballer.glb`,
`football-actions.glb` and `stadium.glb`. Earlier destinations above document the
rejected first attempt. Do not switch back to MPFB or primitive characters.

Rebuild with Blender 5.2 (source files are never changed):

```sh
blender -b -P tools/blender/build_supplied_player.py -- /home/king/Downloads/player/glb/football_player.glb public/assets/supplied
blender -b -P tools/blender/build_supplied_stadium.py -- 'artifacts/supplied/stadium1/Stad de tanger.blend' public/assets/supplied/stadium.glb
npm run assets:check
```

Stadium 1's `.blend` and `Texture/` folder must be extracted beside one another.
The player contains a 25-joint skin already; its importer bind orientation must
be normalized before retargeting. Never copy local Euler tracks between rigs.
The build writes 19 named clips and a 37,286-triangle player with a 2048px atlas.
`COLOR_1` carries a fabric mask used by `src/player-material.ts`; `COLOR_0` stays
neutral. Preserve both attributes. Stadium geometry is Draco-compressed; its
WASM decoder is bundled locally, with no CDN dependency.

Development review pages (run `npm run dev`):

- `/tools/runtime/asset-review.html`: orbit the player, scrub every clip, change
  kit colour, and compare front/side/back. Animation is paused by default.
- `/tools/runtime/match-review.html`: deterministic 22-player scene and six
  camera views. These are inspection tools, not a replacement for playtesting.

`tools/blender/review_supplied.py` records source inventory and renders source
views; `review_player_actions.py` renders the exported rig and exported clips.
Local evidence lives in `artifacts/supplied-review/`. A successful export, build
or test is not sufficient to mark M1 complete.
