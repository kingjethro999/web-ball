# Continue on your PC

1. Extract this ZIP and open the `web-ball` folder in Codex.
2. Use Node 24, then run `npm ci`, `npm test`, and `npm run dev`.
3. Read `SPEC.md`, `AGENTS.md`, `AUDIT.md`, `ASSET_SETUP.md`, and `CREDITS.md` before changing anything.
4. Continue M1 only. The included Quaternius files are source assets; they are not wired to the game. Do not present the existing primitive players as completed work.
5. Use a GPU-enabled browser for the character close-up and six-camera acceptance images. The portrait guard must pause the match, clear input and retain the career. Physical mobile/gamepad tests still need doing.
6. Keep every match SIX real minutes, THREE per half. Keep landscape-only on mobile. Never restore the automatic 2D fallback.
7. Preserve existing save/account protections. Migrate the old single-division saves explicitly when implementing M4.
8. Stop and report milestone status honestly; do not jump to M2–M6 until M1 passes.

Suggested first prompt:

> Read the handoff files. Audit the included CC0 GLTF and locomotion GLB in assets-source/quaternius. Continue M1 without primitive body/head geometry: adapt the humanoid with a football kit and obtain/author the missing football/GK animations. Implement and visually verify all six cameras. Do not claim the source assets are already integrated. Preserve six-minute matches and landscape-only mobile. If a suitable asset cannot be obtained, stop and tell me precisely what is missing. Verify one milestone before proceeding.

## Database

Guest play needs no database. Copy `.env.example` to `.env`, set DATABASE_URL locally, then use `npm run db:migrate` for the additive `webball` schema. No database has been wiped.

Only after the user explicitly confirms resetting **Web Ball data**, the exact PostgreSQL command is:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS webball CASCADE;'
npm run db:migrate
```

This permanently deletes Web Ball accounts/sessions/saves, not the unrelated old project's schema. Do not run it without confirmation. Do not infer permission to wipe other schemas or the entire Neon database. Never paste real credentials into tracked files.
