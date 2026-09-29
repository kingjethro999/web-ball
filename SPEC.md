# Web Ball — authoritative continuation requirements

Latest user corrections override the quoted specification below:

- SIX real playing minutes per match, THREE per half; displayed football clock 0–45 and 45–90.
- LANDSCAPE ONLY, including mobile. Portrait must show a rotate-device screen and pause play. Never turn the game into a portrait website layout.
- Supply a complete source ZIP at the stopping point for local Codex.
- Read docs/reference/chat.txt. Preserve useful existing code; do not restart blindly.

You are continuing work on my existing football game repo. Do NOT start over blindly. First audit what exists, then fix and extend it. The current build is not acceptable, and this message explains why and what I expect instead.

## What is wrong with the current build
1. Players are built from cylinders/boxes with square heads. Unacceptable. I want proper football players that look like humans.
2. The UI looks like a normal website (dropdowns, forms, dashboards). This is a football GAME. It must feel like FIFA 18 / Dream League Soccer.
3. The 3D view is not proper. There is no real match camera like modern football games.
4. There are only 16 clubs. I need 3 divisions.

## Step 0: Audit and plan (do this first, briefly)
- Read the repo, list what works and what to rip out, and give me a short plan by milestone. Then start building.
- Do not leave placeholders, TODOs, or fake buttons. If something isn't built, don't show it.

## 1. Player characters (highest priority)
- Use rigged, skinned humanoid characters (GLTF/GLB with skeleton) with real animations: idle, jog, sprint, turn, pass, shoot, lob/cross, tackle, slide tackle, header, celebrate, dejected, goalkeeper stance/dive/catch/punt, referee.
- Do NOT use cylinders, capsules-as-bodies, boxes, or spheres for the body or head. No blocky characters.
- Source: use CC0 or clearly licensed free models (e.g. Quaternius, KayKit, or similar). Verify each license permits commercial use and redistribution, and list them in CREDITS.md. Do not use Mixamo files committed to the repo unless the license clearly allows it.
- If you cannot obtain a suitable rigged model in your environment, STOP and tell me exactly which files I need to download and where to put them. Don't silently fall back to primitive shapes.
- Customization: recolor kit (shirt, shorts, socks) per club by material swapping. Vary skin tone, hair, height, and build by player so the squad doesn't look cloned. Show shirt numbers. Goalkeepers get a different kit color.
- Animation blending (no snapping between poses), foot planting, players face movement direction, ball interaction that looks intentional.
- Performance: instanced/shared skeletons where possible, target 60fps on a mid phone. Add a quality setting (Low/Med/High).

## 2. Camera system (like modern football games)
Implement these camera views, switchable in Pause > Settings and via a shortcut key/button:
1. Broadcast / Tele (high sideline, default, smooth pan and zoom following the ball)
2. Wide sideline (lower, closer, more dramatic)
3. Dynamic / Cinematic sideline (follows action with slight lead and zoom)
4. End-to-end (behind the goal, depth-focused)
5. Top-down / Tactical
6. Player cam (behind the controlled player)
Also: smooth camera damping, no jitter, no clipping through stands, and automatic cinematic cuts for goals, corners, free kicks, penalties, and replays (a short goal replay is a bonus).
The pitch must be rendered properly: mown grass stripes, correct markings, goals with nets, corner flags, stands/crowd, floodlights, and soft shadows. No z-fighting or flickering.

## 3. UI/UX: must feel like a console/mobile football game
- NO dropdowns, native selects, HTML forms, or website-style navigation anywhere in the game.
- Use big card/tile menus, carousels, tabs, sliders and steppers, and full-screen game-style screens with a side menu (Career, Quick Match, Squad, Market, Stats, Settings).
- Everything is navigable with a gamepad (D-pad/stick, A/B), WASD/arrows + Enter/Esc, mouse, and touch. Show a visible focus highlight on the selected item.
- Visual style: dark broadcast-style overlays, bold typography, team-colored accents, smooth transitions, player card art (FUT-style cards with rating, position, and mini stats).
- Fully responsive: landscape-first on mobile with a touch overlay (virtual stick on the left; Pass, Lob/Cross, Shoot, Sprint, and Switch Player on the right). Layout must not break on small screens.

## 4. Controls
- Gamepad, keyboard (WASD + keys for Pass / Lob-Cross / Shoot / Sprint / Switch player / Pause), and touch.
- Pass, Lob/Cross, Shoot with power-charge bar, direction-based aiming, sprint with stamina, and tackle/switch player on defense.
- Show button remapping in Settings.

## 5. League structure (fictional names only)
- 3 divisions × 16 clubs = 48 original fictional clubs. No real names/logos. Generate crest designs procedurally or with SVG, with unique names, colors, and kits.
- Divisions:
  - Academy Division: EVERY new user starts here. Player base OVR 60-72.
  - Elite Division: higher-rated players (73-79).
  - Pro Division: 80+ players.
- Full round-robin seasons (home and away), league table, promotion/relegation between divisions (top teams up, bottom teams down), and season summary.
- Career menu: Next Match, Fixtures, Table, Stats (top scorers, assists, clean sheets, cards), Squad, Market, Club.
- Also: Quick Match/Exhibition (pick any club) and Multiplayer tile showing "Coming Soon".

## 6. Economy and progression
- Coins earned per match (win > draw > loss, with bonuses for goals and clean sheets, scaled by division).
- Market: buy players, prices scaled by OVR, position, and age.
- Upgrades: each player has a hard cap of 10 upgrade points, spent on individual stats (pace, shooting, passing, dribbling, defending, physical; GK stats for goalkeepers). The cost per point rises. Show before/after stats.
- Coins must be a real constraint. The player has to save to upgrade or buy. Balance so a full season in Academy gives meaningful but not excessive progress.
- Squad management: starting XI, subs bench, reserves. Change formation (4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2, etc.) on a visual pitch by dragging or selecting players (no dropdowns). "Auto-pick best XI" button based on stats and position fit, with out-of-position penalties.

## 7. Match rules and management
- Full football rules: kickoff, throw-ins, goal kicks, corners, free kicks, penalties, offside, fouls, advantage, yellow/red cards, extra stoppage time, half-time/full-time.
- Cards and discipline persist across matches: 2 yellows in consecutive games or accumulated yellows means a suspension. A red card means a ban of 1+ matches. Show suspended players and force a replacement in the squad screen, with auto-suggestion. Also add injuries and fitness/fatigue.
- Pause menu: resume, substitutions (max 5), formation/Game Plan (play style: attacking/balanced/defensive/counter, pressing, width, tempo), camera view, match stats (score, scorers, shots, possession, cards), settings, quit.
- AI: opponents must play sensibly (positioning, pressing, passing lanes, GK behavior) with difficulty scaling by division.

## 8. Accounts and data
- Guest mode: full local save (localStorage/IndexedDB) with clean state management.
- Account mode: register/login, save career to my Neon PostgreSQL via DATABASE_URL (env var only, never commit secrets; provide .env.example). Write migrations for the schema. Ask me before wiping the existing database, and give me the exact command to reset it.
- Sync guest progress into an account when the user signs up.

## Engineering requirements
- Keep the stack modern (TypeScript, Three.js or Babylon.js, a component framework for menus). Clean folder structure, README with setup/run commands, and a CREDITS.md.
- Game logic separate from rendering (so it's testable). Add unit tests for the league, economy, and discipline rules.
- Run the game yourself, check the console for errors, and capture screenshots of: main menu, squad screen, a match in each camera view, pause menu, and mobile layout. If you can't run it, say so clearly rather than claiming it works.
- Push to my GitHub in small, well-named commits after each milestone.

## Milestones (finish and verify each before the next)
M1: Real rigged player models + animations + proper pitch + camera views
M2: Game-style UI shell + full controls (gamepad, keyboard, touch)
M3: Core match gameplay + rules + AI
M4: 3 divisions, league, promotion/relegation, cards/suspensions
M5: Economy, market, upgrades, squad/formation/auto-pick
M6: Accounts, database, guest saves, polish, performance

After each milestone, report: what's done, what's not, what you verified, and any decisions I need to make. Be honest about limitations. If something is not achievable at this quality, tell me plainly and propose the closest alternative.
