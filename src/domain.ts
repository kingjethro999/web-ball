export type Position =
  "GK" | "LB" | "CB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST";
export type Stat =
  "pace" | "shooting" | "passing" | "defending" | "stamina" | "keeping";
export type Player = {
  id: string;
  name: string;
  position: Position;
  age: number;
  skin: number;
  hair: number;
  stats: Record<Stat, number>;
  upgrades: number;
  fitness: number;
  injury: number;
  suspension: number;
  yellows: number;
  goals: number;
  assists: number;
};
export type Club = {
  id: number;
  name: string;
  short: string;
  color: string;
  secondary: string;
  city: string;
  strength: number;
};
export const CLUBS: Club[] = [
  ["Lagos Aurora", "AUR", "#f5c451", "#18281e", "Lagos", 67],
  ["Port Azure", "AZU", "#52b5e5", "#eff9ff", "Port Azure", 70],
  ["Ember Athletic", "EMB", "#f07654", "#291c20", "Ember Bay", 71],
  ["Northbridge FC", "NBR", "#d8e2e9", "#3c4c6a", "Northbridge", 69],
  ["Verdant Rovers", "VER", "#57c78b", "#153728", "Verdant", 66],
  ["Royal Meridian", "MER", "#b7a1ed", "#292239", "Meridian", 74],
  ["Solstice United", "SOL", "#f7d786", "#262239", "Solstice", 73],
  ["Cobalt City", "COB", "#4987ed", "#e7edf8", "Cobalt", 75],
  ["Ironhaven FC", "IRN", "#db626b", "#303445", "Ironhaven", 68],
  ["Tidewater SC", "TID", "#66d0cc", "#233642", "Tidewater", 67],
  ["Atlas Wanderers", "ATL", "#e09d73", "#412d32", "Atlas", 70],
  ["Silverpine", "SIL", "#d9ece3", "#2c5349", "Silverpine", 72],
  ["Crimson Vale", "CRI", "#b93d57", "#f8e8eb", "Crimson", 73],
  ["Dune Rangers", "DUN", "#e5be76", "#344434", "Dune", 68],
  ["Violet Crown", "VIO", "#977ade", "#ece6fb", "Violet", 76],
  ["Skyline Athletic", "SKY", "#99c6dd", "#334957", "Skyline", 72],
].map((a, i) => ({
  id: i,
  name: a[0] as string,
  short: a[1] as string,
  color: a[2] as string,
  secondary: a[3] as string,
  city: a[4] as string,
  strength: a[5] as number,
}));
export const STAT_LABELS: Record<Stat, string> = {
  pace: "Pace",
  shooting: "Shooting",
  passing: "Passing",
  defending: "Defending",
  stamina: "Stamina",
  keeping: "Keeping",
};
export const FORMATIONS: Record<string, Position[]> = {
  "4-3-3": ["GK", "LB", "CB", "CB", "RB", "DM", "CM", "CM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "RW", "ST", "ST"],
  "4-2-3-1": ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "LW", "AM", "RW", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LW", "CM", "DM", "CM", "RW", "ST", "ST"],
};
export const SHAPES: Record<string, [number, number][]> = {
  "4-3-3": [
    [0.04, 0.5],
    [0.24, 0.12],
    [0.2, 0.37],
    [0.2, 0.63],
    [0.24, 0.88],
    [0.39, 0.5],
    [0.5, 0.27],
    [0.5, 0.73],
    [0.73, 0.13],
    [0.78, 0.5],
    [0.73, 0.87],
  ],
  "4-4-2": [
    [0.04, 0.5],
    [0.24, 0.12],
    [0.2, 0.37],
    [0.2, 0.63],
    [0.24, 0.88],
    [0.49, 0.12],
    [0.45, 0.37],
    [0.45, 0.63],
    [0.49, 0.88],
    [0.76, 0.35],
    [0.76, 0.65],
  ],
  "4-2-3-1": [
    [0.04, 0.5],
    [0.24, 0.12],
    [0.2, 0.37],
    [0.2, 0.63],
    [0.24, 0.88],
    [0.38, 0.34],
    [0.38, 0.66],
    [0.61, 0.13],
    [0.58, 0.5],
    [0.61, 0.87],
    [0.78, 0.5],
  ],
  "3-5-2": [
    [0.04, 0.5],
    [0.23, 0.2],
    [0.18, 0.5],
    [0.23, 0.8],
    [0.5, 0.09],
    [0.5, 0.3],
    [0.38, 0.5],
    [0.5, 0.7],
    [0.5, 0.91],
    [0.77, 0.35],
    [0.77, 0.65],
  ],
};
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const first = [
  "Tayo",
  "Luca",
  "Kian",
  "Amir",
  "Enzo",
  "Noah",
  "Idris",
  "Rafael",
  "Seyi",
  "Milo",
  "Dario",
  "Niko",
  "Kofi",
  "Elias",
  "Jalen",
  "Ari",
  "Zane",
  "Ivo",
  "Remy",
  "Theo",
  "Nuru",
  "Kenji",
  "Luan",
  "Malik",
  "Ayo",
  "Soren",
  "Iker",
  "Rami",
  "Dayo",
  "Ciro",
  "Jude",
  "Asa",
];
const last = [
  "Adele",
  "Varela",
  "Okoro",
  "Marin",
  "Duran",
  "Bello",
  "Vale",
  "Santos",
  "Arden",
  "Keita",
  "Moreau",
  "Nwosu",
  "Reyes",
  "Kova",
  "Diallo",
  "Silva",
  "Quaye",
  "Faye",
  "Rossi",
  "Bako",
  "Sano",
  "Mensah",
  "Cruz",
  "Leno",
  "Costa",
  "Sola",
  "Eze",
  "Mora",
  "Amani",
  "Rocha",
  "Afolabi",
  "Dane",
];
const POSITIONS: Position[] = [
  "GK",
  "LB",
  "CB",
  "CB",
  "RB",
  "DM",
  "CM",
  "CM",
  "LW",
  "ST",
  "RW",
  "GK",
  "CB",
  "LB",
  "CM",
  "RW",
  "ST",
  "AM",
  "GK",
  "RB",
  "DM",
  "LW",
  "CB",
];
export function makePlayer(
  seed: number,
  position: Position,
  base: number,
  id: string,
): Player {
  const r = rng(seed);
  const stats = {} as Record<Stat, number>;
  for (const k of Object.keys(STAT_LABELS) as Stat[]) {
    let bonus = 0;
    if (k === "keeping") bonus = position === "GK" ? 8 : -40;
    if (k === "shooting")
      bonus = ["ST", "LW", "RW", "AM"].includes(position) ? 8 : -8;
    if (k === "defending")
      bonus = ["CB", "LB", "RB", "DM"].includes(position) ? 8 : -12;
    if (k === "passing") bonus = ["CM", "AM", "DM"].includes(position) ? 9 : 0;
    if (k === "pace")
      bonus = ["LW", "RW", "LB", "RB"].includes(position)
        ? 9
        : position === "GK"
          ? -15
          : 0;
    stats[k] = Math.max(
      20,
      Math.min(93, Math.round(base + (r() - 0.5) * 17 + bonus)),
    );
  }
  return {
    id,
    name:
      first[Math.floor(r() * first.length)] +
      " " +
      last[Math.floor(r() * last.length)],
    position,
    age: 19 + Math.floor(r() * 14),
    skin: Math.floor(r() * 5),
    hair: Math.floor(r() * 4),
    stats,
    upgrades: 0,
    fitness: 100,
    injury: 0,
    suspension: 0,
    yellows: 0,
    goals: 0,
    assists: 0,
  };
}
export function roster(club: Club) {
  return POSITIONS.map((p, i) =>
    makePlayer(
      club.id * 911 + i * 137 + 12,
      p,
      club.strength,
      `c${club.id}p${i}`,
    ),
  );
}
export function overall(p: Player) {
  const s = p.stats;
  return Math.round(
    p.position === "GK"
      ? s.keeping * 0.7 + s.passing * 0.15 + s.stamina * 0.15
      : ["CB", "LB", "RB", "DM"].includes(p.position)
        ? s.defending * 0.4 + s.pace * 0.2 + s.passing * 0.2 + s.stamina * 0.2
        : ["ST", "LW", "RW"].includes(p.position)
          ? s.shooting * 0.4 +
            s.pace * 0.3 +
            s.passing * 0.15 +
            s.stamina * 0.15
          : s.passing * 0.4 + s.pace * 0.2 + s.stamina * 0.2 + s.shooting * 0.2,
  );
}
export function fit(p: Player, pos: Position) {
  if ((p.position === "GK") !== (pos === "GK")) return -10000;
  const groups = [
    ["LB", "RB", "CB"],
    ["DM", "CM", "AM"],
    ["LW", "RW", "ST"],
  ];
  const penalty =
    p.position === pos
      ? 0
      : groups.some((g) => g.includes(pos) && g.includes(p.position))
        ? 5
        : 13;
  return overall(p) - penalty + (p.fitness - 100) * 0.12;
}
export function available(p: Player) {
  return !p.injury && !p.suspension;
}
// Hungarian assignment: maximizes the full XI's position-aware value, not a greedy pick.
export function bestEleven(players: Player[], formation: string) {
  const ready = players.filter(available);
  const slots = FORMATIONS[formation];
  if (ready.length < 11 || !ready.some((p) => p.position === "GK"))
    throw new Error(
      "You need eleven available players, including a goalkeeper.",
    );
  const n = 11,
    m = ready.length,
    u = Array(n + 1).fill(0),
    v = Array(m + 1).fill(0),
    p = Array(m + 1).fill(0),
    way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity),
      used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity,
        j1 = 0;
      for (let j = 1; j <= m; j++)
        if (!used[j]) {
          const cur = -fit(ready[j - 1], slots[i0 - 1]) - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      for (let j = 0; j <= m; j++)
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const result = Array<string>(11);
  for (let j = 1; j <= m; j++) if (p[j]) result[p[j] - 1] = ready[j - 1].id;
  return result;
}
export type Standing = {
  club: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
};
export type Fixture = { home: number; away: number; score?: [number, number] };
export function schedule(): Fixture[][] {
  const ids = CLUBS.map((c) => c.id),
    rounds: Fixture[][] = [];
  for (let r = 0; r < 15; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < 8; i++) {
      let a = ids[i],
        b = ids[15 - i];
      if ((r + i) % 2) [a, b] = [b, a];
      round.push({ home: a, away: b });
    }
    rounds.push(round);
    ids.splice(1, 0, ids.pop()!);
  }
  return [
    ...rounds,
    ...rounds.map((round) =>
      round.map((f) => ({ home: f.away, away: f.home })),
    ),
  ];
}
export type Career = {
  version: 1;
  manager: string;
  club: number;
  coins: number;
  season: number;
  round: number;
  formation: string;
  lineup: string[];
  bench: string[];
  players: Player[];
  market: Player[];
  fixtures: Fixture[][];
  table: Standing[];
  leaguePlayers: Player[];
  history: {
    id: string;
    opponent: number;
    score: [number, number];
    coins: number;
  }[];
  completed: string[];
};
export const CAMERA_MODES = [
  "broadcast",
  "wide",
  "dynamic",
  "end-to-end",
  "tactical",
  "player",
] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];
export type Settings = {
  camera: CameraMode;
  difficulty: "casual" | "club" | "elite";
  duration: number;
  quality: "low" | "high";
  sound: boolean;
  touch: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  camera: "broadcast",
  difficulty: "club",
  duration: 360,
  quality: "high",
  sound: true,
  touch: false,
};
export function marketPlayers(season = 1, round = 0) {
  return Array.from({ length: 12 }, (_, i) =>
    makePlayer(
      55001 + season * 99 + round * 301 + i * 71,
      POSITIONS[(i + round) % 18],
      71 + (i % 5) * 3,
      `m${season}-${round}-${i}`,
    ),
  );
}
export function newCareer(manager = "Manager", club = 0): Career {
  const players = roster(CLUBS[club]);
  const lineup = bestEleven(players, "4-3-3");
  return {
    version: 1,
    manager,
    club,
    coins: 1800,
    season: 1,
    round: 0,
    formation: "4-3-3",
    lineup,
    bench: players
      .filter((p) => !lineup.includes(p.id))
      .slice(0, 7)
      .map((p) => p.id),
    players,
    market: marketPlayers(),
    fixtures: schedule(),
    table: CLUBS.map((c) => ({
      club: c.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
    })),
    leaguePlayers: CLUBS.filter((c) => c.id !== club).flatMap(roster),
    history: [],
    completed: [],
  };
}
export function price(p: Player) {
  return Math.round(((overall(p) - 45) ** 2 * 2.2) / 50) * 50;
}
export function upgradeCost(p: Player) {
  return 150 + p.upgrades * 75;
}
export function upgrade(c: Career, id: string, stat: Stat): Career {
  const p = c.players.find((p) => p.id === id);
  if (!p) throw new Error("Player not found.");
  if (p.upgrades >= 10)
    throw new Error("This player has used all 10 upgrade points.");
  if (p.stats[stat] >= 99)
    throw new Error("This attribute is already at its maximum.");
  const cost = upgradeCost(p);
  if (c.coins < cost) throw new Error("Not enough coins.");
  return {
    ...c,
    coins: c.coins - cost,
    players: c.players.map((x) =>
      x.id === id
        ? {
            ...x,
            upgrades: x.upgrades + 1,
            stats: { ...x.stats, [stat]: x.stats[stat] + 1 },
          }
        : x,
    ),
  };
}
export function buy(c: Career, id: string): Career {
  const p = c.market.find((p) => p.id === id);
  if (!p) throw new Error("This player is no longer available.");
  if (c.players.length >= 35)
    throw new Error("Your squad is full (35 players).");
  if (c.coins < price(p)) throw new Error("Not enough coins.");
  return {
    ...c,
    coins: c.coins - price(p),
    players: [...c.players, p],
    market: c.market.filter((x) => x.id !== id),
  };
}
export function sortTable(table: Standing[]) {
  return [...table].sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.club - b.club,
  );
}
export type MatchResult = {
  id: string;
  forfeited?: boolean;
  score: [number, number];
  goals: { player: string; assist?: string; team: number; minute: number }[];
  cards: { player: string; yellow: boolean; red: boolean }[];
  fitness: Record<string, number>;
  injuries: string[];
};
function applyScore(
  table: Standing[],
  home: number,
  away: number,
  a: number,
  b: number,
) {
  for (const [id, gf, ga] of [
    [home, a, b],
    [away, b, a],
  ]) {
    const t = table.find((t) => t.club === id)!;
    t.played++;
    t.gf += gf;
    t.ga += ga;
    t.won += +(gf > ga);
    t.drawn += +(gf === ga);
    t.lost += +(gf < ga);
    t.points += gf > ga ? 3 : gf === ga ? 1 : 0;
  }
}
export function finishMatch(c: Career, result: MatchResult): Career {
  if (c.completed.includes(result.id)) return c;
  if (c.round >= 30) throw new Error("Season complete. Start the next season.");
  const next = structuredClone(c),
    round = next.fixtures[c.round],
    f = round.find((x) => x.home === c.club || x.away === c.club)!;
  const opponent = f.home === c.club ? f.away : f.home;
  f.score =
    f.home === c.club ? result.score : [result.score[1], result.score[0]];
  applyScore(next.table, f.home, f.away, ...f.score);
  const reward = result.forfeited
    ? 0
    : 250 +
      (result.score[0] > result.score[1]
        ? 450
        : result.score[0] === result.score[1]
          ? 200
          : 50) +
      result.score[0] * 50;
  next.coins += reward;
  next.history.unshift({
    id: result.id,
    opponent,
    score: result.score,
    coins: reward,
  });
  next.history = next.history.slice(0, 30);
  next.completed.push(result.id);
  for (const p of next.players) {
    p.suspension = Math.max(0, p.suspension - 1);
    p.injury = Math.max(0, p.injury - 1);
    p.fitness = Math.min(100, (result.fitness[p.id] ?? p.fitness) + 18);
  }
  for (const card of result.cards) {
    const p = next.players.find((p) => p.id === card.player);
    if (!p) continue;
    if (card.yellow) p.yellows++;
    if (card.red) p.suspension = Math.max(p.suspension, card.yellow ? 1 : 3);
    if (p.yellows >= 5) {
      p.suspension = Math.max(p.suspension, 1);
      p.yellows = 0;
    }
  }
  for (const id of result.injuries) {
    const p = next.players.find((p) => p.id === id);
    if (p) p.injury = 2;
  }
  for (const g of result.goals) {
    const p = [...next.players, ...next.leaguePlayers].find(
      (p) => p.id === g.player,
    );
    if (p) p.goals++;
    const a = [...next.players, ...next.leaguePlayers].find(
      (p) => p.id === g.assist,
    );
    if (a) a.assists++;
  }
  const rand = rng(c.season * 10000 + c.round * 231 + 47);
  for (const other of round) {
    if (other === f) continue;
    const a = Math.max(
        0,
        Math.floor(rand() * 4 + (CLUBS[other.home].strength - 70) * 0.05),
      ),
      b = Math.max(
        0,
        Math.floor(rand() * 4 + (CLUBS[other.away].strength - 70) * 0.05),
      );
    other.score = [a, b];
    applyScore(next.table, other.home, other.away, a, b);
    for (const [club, goals] of [
      [other.home, a],
      [other.away, b],
    ])
      for (let j = 0; j < goals; j++) {
        const candidates = next.leaguePlayers.filter(
          (p) =>
            p.id.startsWith(`c${club}p`) &&
            ["ST", "LW", "RW", "AM", "CM"].includes(p.position),
        );
        const p = candidates[Math.floor(rand() * candidates.length)];
        if (p) p.goals++;
        if (rand() > 0.25) {
          const assist = candidates.filter((x) => x.id !== p?.id)[
            Math.floor(rand() * (candidates.length - 1))
          ];
          if (assist) assist.assists++;
        }
      }
  }
  next.round++;
  next.market = marketPlayers(next.season, next.round);
  if (
    next.lineup.some((id) => !available(next.players.find((p) => p.id === id)!))
  ) {
    try {
      next.lineup = bestEleven(next.players, next.formation);
      next.bench = next.players
        .filter((p) => available(p) && !next.lineup.includes(p.id))
        .slice(0, 7)
        .map((p) => p.id);
    } catch {
      /* User can recruit replacements. */
    }
  }
  return next;
}
export function nextSeason(c: Career): Career {
  if (c.round < 30) throw new Error("Finish the current season first.");
  const rank = sortTable(c.table).findIndex((t) => t.club === c.club);
  return {
    ...c,
    season: c.season + 1,
    round: 0,
    fixtures: schedule(),
    table: newCareer().table,
    coins: c.coins + (16 - rank) * 200,
    market: marketPlayers(c.season + 1),
    players: c.players.map((p) => ({
      ...p,
      goals: 0,
      assists: 0,
      yellows: 0,
      suspension: 0,
      injury: 0,
      fitness: 100,
    })),
    leaguePlayers: c.leaguePlayers.map((p) => ({ ...p, goals: 0, assists: 0 })),
  };
}
