# Credits and asset licensing

## Included source and generated runtime assets

**Quaternius — Universal Base Characters, Standard free edition**
https://quaternius.itch.io/universal-base-characters
Selected `Superhero_Male_FullBody.gltf` with buffer and all referenced images. License: **CC0 1.0 Universal**, confirmed in the downloaded archive's `License_Standard.txt`, copied to `assets-source/quaternius/base-character/LICENSE.txt`. CC0 permits commercial use, modification and redistribution. Retrieved 2026-09-28. No paid Source files included.

**Quaternius — Universal Animation Library, Standard free edition**
https://quaternius.itch.io/universal-animation-library
`UAL1_Standard.glb`, no root motion, and original README. License: **CC0 1.0 Universal**, confirmed in the downloaded archive and preserved at `assets-source/quaternius/animations/LICENSE.txt`. Commercial use and redistribution permitted. Retrieved 2026-09-28. No paid Pro/Source files included. The vendor credits Gonzalo Furnier for animation contributions.

Runtime exports at `public/assets/players/footballer.glb` and
`public/assets/players/football-actions.glb` were generated locally with
Blender 5.2 LTS. The human mesh, skinning, skeleton, idle, walk, jog and sprint
come from the CC0 sources above. Web Ball adds named football-kit material
regions and locally authored football, goalkeeper and referee animation clips.
The runtime license and transformation record is preserved beside the GLBs at
`public/assets/players/LICENSE.txt`.

CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/

## Existing bundled presentation assets

Barlow / Barlow Condensed fonts — SIL Open Font License 1.1; full notice at `public/fonts/OFL.txt`.
Lucide icons — ISC license, installed through npm; preserve the package license when redistributing dependencies.
Three.js — MIT; React — MIT. Dependencies and transitive versions are recorded in `package-lock.json`; preserve their respective package licenses.

Fictional club names, procedural crests, pitch/crowd art, interface and synthesized effects were created for this project. The legacy primitive character renderer and software renderer are rejected prototype work, not the desired art direction. No real club/player branding, proprietary FIFA/DLS assets, or Mixamo files are bundled.

## Supplied player and stadium — 2026-09-30

King Jethro supplied the local `Downloads/player`, `Downloads/stadium1` and
`Downloads/stadium2` packages and stated that he created them and retrieved them
from his Google Drive. The active player and Stadium 1 exports are in
`public/assets/supplied/`; their receipts record source hashes. Source archives
remain untouched. The archives also contain older third-party metadata; no new
independent authorship or licensing verification is claimed here.

The player retains its original mesh, texture and skin weights, with the visible
bind pose normalized, geometry reduced, and a fabric mask added. Walk, jog,
sprint and idle are retargeted from the CC0 Quaternius animation library credited
above. Football and goalkeeper clips are locally authored. The previous
Quaternius/MPFB character adaptations are rejected experiments and are no longer
the active character.

Stadium 1 retains its supplied architecture and seat atlas. Its legacy materials
are converted to PBR; missing auxiliary texture files use material colours. Its
embedded ground is replaced by the game's regulation pitch. Stadium 2 remains a
source candidate: its 6.16 million triangles exceed the runtime budget.

**Google Draco decoder** — Apache License 2.0. Decoder files copied from the
installed Three.js package; notice preserved at `public/assets/draco/LICENSE`.
