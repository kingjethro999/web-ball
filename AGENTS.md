# Web Ball — development handoff

Read SPEC.md, AUDIT.md and ASSET_SETUP.md first. SPEC.md supersedes older README descriptions. Milestones must be finished and verified in order; M1 is not complete. Do not pass off the legacy renderer as the requested character quality.

## Product requirements

This is King Jethro's original browser football game. Preserve the name Web Ball unless asked otherwise. The reference is the flow of football career games, not copying their proprietary branding or assets.

- **Default match time must stay SIX real playing minutes, THREE per half.** The scoreboard displays 0–45 then 45–90. Do not shorten this to a 90-second or three-minute match. The user explicitly corrected this.
- Keep keyboard WASD, gamepad, and touch controls supported through one input contract.
- Target 48 fictional clubs: 16 each in Academy, Elite and Pro. Every new career starts Academy (base OVR60–72), Elite73–79, Pro80+. Existing 16-club careers need an explicit migration, never silent data loss.
- Multiplayer remains Coming soon until the user supplies the intended server specification.
- Guest mode must work without a database or account. Cloud progress is optional and must never silently overwrite another save.
- Never request secrets in source code or commit `.env`. The user plans to use Neon; migration uses a separate `webball` schema and does not erase unrelated data. Ask before any database wipe; never execute a destructive reset automatically.

## Start

Use Node 24. `npm ci`, `npm run dev`. `npm test` and `npm run build` are the existing verification commands. Account development: Docker Compose, `.env`, `npm run db:migrate`, `npm run dev:server` in another terminal. Read README for deployment origin/TLS requirements.

## Architecture and invariants

1. Keep the match engine independent of React and rendering. Advance at a fixed 1/60 second step. Render frames separately. Do not recreate the match on every React update.
2. Input actions are edges, movement/sprint are continuous. Retain actions until a simulation step consumes them; clear on blur and pause. Release touch capture on cancel. Do not lose actions on high-refresh displays.
3. `finishMatch` is the only career settlement path. Keep duplicate-match rejection, nonnegative coins, owned-player validation and atomic transfers/upgrades. Forfeits give no coins.
4. Squad ids must be unique and point to existing owned players. GK slots must contain a goalkeeper. Unavailable players cannot be selected. A sent-off player cannot be replaced. A substituted player cannot re-enter. Maximum five substitutions.
5. Ten upgrades means ten total +1 attribute purchases per player, not ten per attribute. Stats cap at 99.
6. Career bans are Aurora League policies. Do not present them as a universal interpretation of IFAB law.
7. Primitive body/head characters are rejected. Use licensed rigged/skinned humanoids with blended football animations. Stop if suitable assets cannot be obtained; tell the user exact downloads and destinations. Record commercial/redistribution license and provenance in CREDITS.md.
8. Never silently fall back to software/2D or primitive people. Missing WebGL must produce an explicit error. The old canvas-renderer.ts is historical source only and is not imported by the active renderer.
9. Account APIs use scrypt hashes, random hashed sessions, HttpOnly cookies, same-origin JSON mutations, parameterized SQL, bounded payloads and revision checks. Do not regress any of these.
10. Single-player game state is client-authoritative. Never reuse it as authoritative multiplayer state or a competitive/redeemable economy.

## Most valuable next work

- Playtest the Three.js renderer on the actual PC, then on the phone. GPU rendering was unavailable in the build environment; it was compiled but not visually validated there.
- Improve goalkeeper dive animation, strafe/backpedal transitions, teammate support spacing, ball reception and shot variety from real playtest observations.
- M1 is mandatory: rigged/skinned human models, football animations, six cameras, verified pitch. See SPEC.md and ASSET_SETUP.md.
- Test physical Xbox/PlayStation pads and Android touch. Verify background-tab pause and resumed input.
- Refine set pieces into dedicated taker/aim states. Add complete restart encroachment and keeper rules only with tests and accurate documentation.
- Add account password-reset and verification flows before inviting public users.
- Add in-progress-match persistence if requested, preserving result idempotency.

## Evidence and limits

Read README's alpha limitations. Do not claim full FIFA/DLS quality, full rules compliance, live multiplayer, tested Neon connectivity or verified physical-device support. Tests use PGlite for PostgreSQL-compatible account integration and deterministic scenario tests for match rules. Expand tests when fixing an actual risk, not to mirror implementation.

Changes should keep the dark green/charcoal, amber, condensed sports typography and native game-menu layout consistent. Mobile is landscape-only. Portrait shows a rotate screen and pauses active matches. Remove native selects and forms during M2; use game menus and full controller focus navigation. Keep all main game screens functional rather than converting them into a marketing site.
