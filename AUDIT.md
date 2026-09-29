# Audit and continuation status — 2026-09-28

## Read first

This ZIP is an **unfinished continuation checkpoint**, not completion of M1–M6. Read SPEC.md and docs/reference/chat.txt. The current footballer renderer is still legacy procedural geometry, explicitly rejected by the user. Downloaded humanoid assets are source material only. Do not tell the user the character overhaul is finished.

## Keep / extend

- React + TypeScript + Three.js, separate fixed-step match engine.
- Six real playing minutes, three per half, with tests; default saved settings migration.
- Existing ball physics, basic AI, restarts/offside/cards and five-substitution rules as a starting point, not full football-law compliance.
- Fixtures, standings, atomic coin purchases/upgrades, unique squad membership, position-aware best XI, idempotent settlement.
- Guest save validation/backups. Optional PostgreSQL account service, scrypt password hashes, hashed sessions, origin checks and revision conflict protection.
- Existing striped pitch/markings/goals/nets/stands as a starting point, subject to GPU inspection.

## Replace / extend substantially

- Replace `Stadium.player()` primitive meshes and manual limb swings with licensed skinned human assets and real football animations. The old art is not acceptable.
- Replace native selects/forms, website navigation and portrait layouts with landscape game menus and controller focus navigation.
- Extend three legacy camera modes to all six requested modes, including cuts and smooth ball/controlled-player tracking.
- Replace single 16-club league assumptions with three 16-club divisions and versioned save migration, promotion/relegation and Academy entry.
- Add charged actions/remapping, full game-plan controls, missing rules, consecutive-game discipline, expanded attributes and division-scaled economy.

## Changes at this checkpoint

- Added landscape-only presentation guard. Portrait content is hidden and inert; active play pauses and requires explicit resume after rotation. This does not claim every landscape mobile menu is already redesigned.
- Removed automatic 2D fallback from `createStadium`. WebGL failure is explicit. `canvas-renderer.ts` is retained as inactive historical source.
- Downloaded and inspected official CC0 humanoid and locomotion assets; preserved licenses and inventory. No football-animation substitute was silently used.
- Added SPEC.md, this audit, ASSET_SETUP.md, CREDITS.md and local-Codex handoff. Updated AGENTS.md to supersede old 16-club/fallback guidance.

## Milestone plan and acceptance gates

| Milestone | Current status | Work / verification required |
|---|---|---|
| M1 | Incomplete — asset quality gate | Dress/adapt included human rig; football/GK/referee clips, blending/foot contacts, kit/appearance variation; six cameras and pitch validation. Show actual GPU close-ups and match screenshots. |
| M2 | Not started as an overhaul | Landscape console-style UI, no native selects/forms; gamepad focus, remapping, charged keyboard/touch/pad actions; small landscape-device checks. Orientation guard alone does not complete M2. |
| M3 | Legacy partial foundation | Complete rules incl. advantage/added time; tactical AI/GK behavior and dedicated set pieces; scenario tests and live playtests. |
| M4 | Legacy one-division foundation | 48 clubs, rating tiers, new-career Academy default, promotion/relegation, clean sheets/card stats, consecutive-yellow policy and save migration. |
| M5 | Legacy partial foundation | Division/position/age prices and rewards, expanded stats, ten-point cap, before/after display, visual formations and squad management. |
| M6 | Legacy partial foundation | Guest-to-account sync, deployment/Neon validation, quality tiers, phone performance and polish. Ask before DB destruction. |

Finish and verify each milestone before starting the next. The next concrete local task is M1 asset integration, not more dashboard screens. The user requested stopping when suitable football character assets cannot be obtained; the included base/locomotion source does not satisfy the complete footballer requirement. See exact asset instructions.

## Verification

`npm run build` passed after the code corrections (TypeScript + Vite); bundle warning remains (~943 KB JS, ~259 KB gzip).
`npm test`: **18 passed**, including 360-second duration/180-second half, round robin, purchases/upgrades, settlement, cards, restarts, offside, substitutions, AI timing and account integration using PGlite.
These tests cover the OLD implemented scope. They do not verify three divisions, new models, six cameras, complete football rules, new portrait behavior or hardware performance.

Earlier browser checks used the now-removed software fallback. Images in docs/previews are **historical rejected-build screenshots**, not current acceptance evidence. The preview environment disabled WebGL; the new browser invocation timed out. No new GPU screenshots, physical gamepad/touch checks or 60fps claim are available. Do not fabricate the requested six-camera captures.

## Delivery / GitHub

No Git remote is configured in this workspace and no new repository was created or pushed. This ZIP is the local continuation route the user requested. Do not push to an unrelated repository. Once the user identifies the intended remote, commit each verified milestone with a descriptive name and push there.
