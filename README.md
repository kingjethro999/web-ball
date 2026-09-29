# Web Ball

**Continuation checkpoint, not the requested finished overhaul.** Start with [LOCAL_CODEX_START.md](LOCAL_CODEX_START.md), [AUDIT.md](AUDIT.md), [SPEC.md](SPEC.md), and [ASSET_SETUP.md](ASSET_SETUP.md). M1 is incomplete: licensed rigged source assets are included but are NOT integrated. The existing primitive player renderer is rejected legacy code.

Mobile is now landscape-only: portrait shows a rotate screen and pauses active play. The automatic software fallback has been removed.

An original, single-player browser football game. Build a fictional club, play an AI league, recruit players, and develop your squad. This is a playable **alpha**, with an arcade simulation rather than a recreation of FIFA's engine.

**Default match duration: 6 real minutes of play, 3 per half.** The scoreboard represents 0–45 and 45–90 football minutes. Pauses, half-time and restart animations do not consume playing time. Earlier short-duration settings migrate to this default once.

## Run on your PC

Use Node 24 (or Node >=22.12).

```bash
npm ci
npm run dev
```

Open the local URL printed in the terminal. Guest mode requires **no database, credentials, external AI service or account**. To play from a phone on the same Wi-Fi, use the PC's LAN address and Vite port, for example `http://192.168.1.10:5173`. The development server binds to all interfaces; use it only on a trusted network. Production gamepad compatibility is best over HTTPS or localhost.

For a production build served by the included Node server:

```bash
npm run build
npm start
```

Open `http://localhost:3001`. Guest mode works with the account service disabled. The `dist/` directory can also be hosted as a static site; account APIs need the Node server on the same origin.

## Controls

| Action                   | Keyboard          | Standard gamepad   | Mobile        |
| ------------------------ | ----------------- | ------------------ | ------------- |
| Move                     | WASD / arrow keys | Left stick / D-pad | Left joystick |
| Sprint                   | Shift             | RB / R1            | Hold Sprint   |
| Pass / pressure opponent | J                 | A / Cross          | Pass          |
| Shoot                    | K                 | B / Circle         | Shoot         |
| Lob / cross              | L                 | X / Square         | Lob           |
| Switch player            | Space             | Y / Triangle       | Switch        |
| Tackle                   | E                 | LT / L2            | Tackle        |
| Pause / game plan        | Escape            | Start / Options    | Pause icon    |

Aim using movement. Passing chooses a teammate in the aimed direction. Shooting targets the opponent's goal with accuracy affected by attributes. Press a controller button after connecting it so the browser detects it. Physical gamepad and phone testing is still needed on your hardware. Touch controls appear on coarse-pointer devices and can be forced in Settings. Landscape is recommended.

## Included

- Legacy procedural 3D characters (rejected; replacement incomplete), kit colors, pitch, nets, flags, crowd and shadows.
- WebGL failure is explicit; there is no active automatic 2D fallback.
- 11-a-side matches, ball movement and bounce, AI runs, passing, shooting, goalkeeper saves and defensive challenges.
- Goals, throw-ins, corners, goal kicks, free kicks, penalties, basic offside, yellow/second-yellow/straight-red cards, fatigue and injuries.
- Half-time end changes; broadcast, tactical and close cameras; difficulty and graphics settings.
- Pause-menu match stats, scorers and bookings, formation and playing-style changes, and up to five substitutions.
- Exhibition club selection and random fixtures. Exhibition does not change career progress.
- A 16-club, home-and-away, 30-matchday career league, simulated other fixtures, standings, scorers, assists, recent results and season rollover.
- Fictional generated players with position-specific attributes, fitness, suspension and injury status.
- Starting XI, seven substitutes and reserves. Position-aware best XI uses a maximum-weight assignment, not a simple rating sort.
- Transfers paid with earned coins. Each player has a permanent **10-total-attribute-point** development cap.
- Guest local saves, a last-good backup, schema validation, and optional account saves with conflict detection.
- Multiplayer marked **Coming soon**. No fake online matchmaking or server integration.

## Career rules

Win: 3 league points. Draw: 1. Ranking: points, goal difference, goals scored.

Match income: 250 appearance coins + 450 for a win / 200 for a draw / 50 for a loss + 50 per goal. Leaving a career match records a 0–3 defeat with no coins. A result cannot be settled twice. Season bonus: 200 coins per place above last, including last (champion: 3,200).

Five accumulated yellows: one-match suspension. Second-yellow dismissal: one-match suspension. Straight red: three-match suspension. These are **Aurora League competition rules**, not universal rules for all football leagues. An unavailable starter is replaced by the best-XI system after settlement. Players substituted off cannot return; a dismissed player cannot be replaced.

A new market arrives after each league match. Signings join reserves; use Squad to move them into the XI or bench. Each attribute upgrade costs 150 + 75 per previously purchased point. One purchase adds one attribute point, capped at 99.

## Optional PostgreSQL / Neon accounts

The game uses a separate `webball` schema. **Migrations do not erase old project data.** No database has been accessed, cleared or configured on your behalf. Keep connection strings out of Git.

Local database:

```bash
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run dev:server
```

In a second terminal, run `npm run dev`. The frontend proxies `/api` to port 3001. The Docker example is for local development only; its credentials are not suitable for a public database.

For Neon, set `DATABASE_URL` to your own PostgreSQL connection string, preserving its TLS parameters such as `sslmode=require`. Then run `npm run db:migrate` and restart the account server. Do not disable certificate verification.

For production, configure:

```dotenv
DATABASE_URL=your-private-connection-string
APP_ORIGIN=https://your-game-domain.example
NODE_ENV=production
PORT=3001
```

Serve the client and API on the same HTTPS origin behind your reverse proxy. Production cookies use Secure, HttpOnly and SameSite=Strict. Requests that mutate data require the exact configured Origin and JSON. If testing the production build locally in development mode, set `APP_ORIGIN=http://localhost:3001` before submitting account forms.

Passwords use scrypt with individual random salts. Session tokens are cryptographically random and only their SHA-256 hashes are stored in the database. SQL is parameterized. Login/register requests are rate-limited in-process. Account saves use optimistic revisions so stale clients cannot silently overwrite newer saves.

Account saving/loading is explicit through **Manager profile**. Logging in never automatically overwrites a guest career or an existing account career.

Before a public account launch, add email verification, password reset and a shared rate-limit store for multiple server instances. Expired session rows can be removed periodically with `DELETE FROM webball.sessions WHERE expires_at < now()`. Single-player progression is client-authoritative, so this is **not suitable for competitive rewards or an online economy** without server-side validation.

## Validation

```bash
npm test
npm run build
```

18 automated tests cover six-minute timing, schedules, formation assignment, transactions, upgrade caps, progression, suspensions, season rollover, save validation, scoring, restarts, offside, substitutions and an AI simulation. Account integration is tested against PGlite (the PostgreSQL engine compiled to WASM), including registration, password hashes, sessions, authentication, ownership isolation, revision conflicts and logout.

Historical checks of the rejected build (NOT new M1 acceptance): browser checks covered home and settings, entering a match, the six-minute selection, pause/resume and a substitution. The home, squad and transfer-market layouts were also checked in a 390px iframe with no horizontal overflow. The testing browser disables WebGL; browser gameplay checks therefore used the software fallback. The 3D renderer compiles but has **not been visually or performance-validated on a GPU in this environment**. Test High and Low modes on your PC. Actual Neon connectivity and physical controller/mobile hardware remain untested.

## Deliberate alpha limitations

- This is an arcade football simulation, not full IFAB-law parity. Basic restarts and offside work; advantage, handball, VAR, exact restart encroachment, goalkeeper back-pass/eight-second enforcement, added time, abandoned-match minimum-player rules, and shoot-outs are not implemented.
- Players and movement are original procedural assets, not motion-captured professional character models. Goalkeeper save poses, player transitions and AI decision-making need further playtesting and polish.
- CPU opponents use rule-based game AI, not an LLM. No paid API calls are required.
- A match in progress is not restored after a browser reload. Completed guest career progress is saved; clearing browser storage can remove it.
- Audio currently consists of synthesized whistle and goal cues, not recorded crowd commentary.
- Multiplayer is deliberately unavailable pending your server integration.

## Football references

The implementation draws on the IFAB descriptions of offside and foul/restart distinctions. These references do not imply full rules compliance:

- https://www.theifab.com/laws/latest/offside/
- https://www.theifab.com/laws/latest/fouls-and-misconduct/
- https://www.theifab.com/laws/latest/the-penalty-kick/

## Project map

- `src/domain.ts`: players, clubs, formation assignment, transfers, upgrades, career settlement and seasons.
- `src/engine.ts`: renderer-independent match state and fixed-step simulation.
- `src/renderer.ts`: Three.js pitch, stadium, characters, cameras and animation.
- `src/canvas-renderer.ts`: inactive historical compatibility code; not imported by the renderer.
- `src/input.ts`: keyboard, Gamepad API, touch state and audio.
- `src/App.tsx`: game menu, career, squad, market, league and in-match UI.
- `src/storage.ts`: save schemas, device storage, settings migration and API helper.
- `server/app.ts`: account and cloud-save endpoints.
- `server/db.ts`: non-destructive PostgreSQL schema migration.
- `test/`: domain, simulation and account integration tests.
- `AGENTS.md`: handoff instructions for continuing with Codex locally.

## Push this project to a new repository

After creating an empty repository in your GitHub account, run these inside this folder. Replace the example remote with the repository you created. If Git is already initialized, skip `git init`; never force-push over an unrelated repository.

```bash
git init -b main
git add .
git commit -m "Build Web Ball playable alpha"
git remote add origin https://github.com/YOUR_USERNAME/web-ball.git
git push -u origin main
```

No keys, dependencies or database contents should be committed. `node_modules`, build output, environment files and local artifacts are ignored. Font files are bundled from the open-source Barlow family; see `public/fonts/OFL.txt`. No actual club crests, kits, names, licensed player likenesses or proprietary game assets are included.
