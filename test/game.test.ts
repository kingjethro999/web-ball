import test from "node:test";
import assert from "node:assert/strict";
import {
  newCareer,
  schedule,
  CLUBS,
  FORMATIONS,
  roster,
  bestEleven,
  upgrade,
  upgradeCost,
  buy,
  price,
  finishMatch,
  nextSeason,
  DEFAULT_SETTINGS,
  type MatchResult,
} from "../src/domain";
import { careerSchema, settingsSchema } from "../src/storage";
import { Match, emptyInput } from "../src/engine";
function setup() {
  return new Match(
    roster(CLUBS[0]).slice(0, 11),
    roster(CLUBS[1]).slice(0, 11),
    { ...DEFAULT_SETTINGS },
    "4-3-3",
    "test-match",
  );
}
const result = (id = "r1"): MatchResult => ({
  id,
  score: [2, 1],
  goals: [],
  cards: [],
  fitness: {},
  injuries: [],
});
test("six-minute matches: default is 360 seconds, half-time at exactly 180", () => {
  assert.equal(DEFAULT_SETTINGS.duration, 360);
  const m = setup();
  m.phase = "playing";
  m.clock = 179.99;
  m.update(0.02, emptyInput());
  assert.equal(m.phase, "halftime");
  assert.equal(m.clock, 180);
  assert.equal(m.minute, 45);
  m.resumeHalf();
  assert.equal(m.half, 2);
  assert.equal(m.direction(0), -1);
  m.phase = "playing";
  m.clock = 359.99;
  m.update(0.02, emptyInput());
  assert.equal(m.phase, "finished");
  assert.equal(m.clock, 360);
  assert.equal(m.minute, 90);
});
test("fixture list is a balanced double round robin", () => {
  const rounds = schedule();
  assert.equal(rounds.length, 30);
  const pairs = new Set<string>();
  for (const round of rounds) {
    assert.equal(round.length, 8);
    assert.equal(new Set(round.flatMap((f) => [f.home, f.away])).size, 16);
    for (const f of round) {
      assert.notEqual(f.home, f.away);
      assert.ok(!pairs.has(`${f.home}-${f.away}`));
      pairs.add(`${f.home}-${f.away}`);
    }
  }
  assert.equal(pairs.size, 240);
  for (const c of CLUBS) {
    assert.equal(rounds.flat().filter((f) => f.home === c.id).length, 15);
    assert.equal(rounds.flat().filter((f) => f.away === c.id).length, 15);
  }
});
test("every club has a valid XI in every formation, excluding unavailable players", () => {
  for (const c of CLUBS) {
    const players = roster(c);
    players[9].suspension = 1;
    for (const formation of Object.keys(FORMATIONS)) {
      const ids = bestEleven(players, formation);
      assert.equal(new Set(ids).size, 11);
      assert.equal(players.find((p) => p.id === ids[0])!.position, "GK");
      assert.ok(!ids.includes(players[9].id));
    }
  }
});
test("upgrades debit coins, change one attribute, and stop at ten", () => {
  let c = newCareer();
  c.coins = 100000;
  const id = c.players[9].id,
    old = c.players[9].stats.passing;
  for (let i = 0; i < 10; i++) {
    const price = upgradeCost(c.players[9]),
      coins = c.coins;
    c = upgrade(c, id, "passing");
    assert.equal(c.coins, coins - price);
  }
  assert.equal(c.players[9].stats.passing, old + 10);
  assert.throws(() => upgrade(c, id, "passing"), /10 upgrade/);
});
test("insufficient coins cannot sign or upgrade players", () => {
  const c = newCareer();
  c.coins = 0;
  assert.throws(() => buy(c, c.market[0].id), /coins/);
  assert.throws(() => upgrade(c, c.players[0].id, "pace"), /coins/);
});
test("signing atomically removes a market listing and adds one reserve", () => {
  let c = newCareer();
  c.coins = 10000;
  const p = c.market[0],
    coins = c.coins;
  c = buy(c, p.id);
  assert.equal(c.coins, coins - price(p));
  assert.equal(c.players.length, 24);
  assert.ok(!c.market.some((q) => q.id === p.id));
  assert.ok(!c.lineup.includes(p.id));
  assert.throws(() => buy(c, p.id), /no longer/);
  careerSchema.parse(c);
});
test("a match is settled once and all league clubs play the same round", () => {
  let c = newCareer();
  const r = result();
  c = finishMatch(c, r);
  assert.equal(c.round, 1);
  assert.equal(c.coins, 2600);
  assert.ok(c.table.every((t) => t.played === 1));
  assert.ok(c.fixtures[0].every((f) => f.score));
  assert.equal(c.table.find((t) => t.club === 0)!.points, 3);
  assert.equal(finishMatch(c, r), c);
  careerSchema.parse(c);
});
test("forfeit records a defeat without coin farming", () => {
  const c = newCareer();
  const n = finishMatch(c, { ...result(), score: [0, 3], forfeited: true });
  assert.equal(n.coins, c.coins);
  assert.equal(n.round, 1);
  assert.equal(n.table[0].lost, 1);
});
test("disciplinary bans apply to the next fixture and unavailable players leave the XI", () => {
  let c = newCareer();
  const id = c.lineup[2];
  c.players.find((p) => p.id === id)!.yellows = 4;
  c = finishMatch(c, {
    ...result(),
    cards: [{ player: id, yellow: true, red: false }],
  });
  assert.equal(c.players.find((p) => p.id === id)!.suspension, 1);
  assert.ok(!c.lineup.includes(id));
  c = finishMatch(c, result("r2"));
  assert.equal(c.players.find((p) => p.id === id)!.suspension, 0);
});
test("straight red and second yellow have distinct suspension lengths", () => {
  const c = newCareer(),
    a = c.lineup[2],
    b = c.lineup[3];
  const n = finishMatch(c, {
    ...result(),
    cards: [
      { player: a, yellow: false, red: true },
      { player: b, yellow: true, red: true },
    ],
  });
  assert.equal(n.players.find((p) => p.id === a)!.suspension, 3);
  assert.equal(n.players.find((p) => p.id === b)!.suspension, 1);
});
test("a full season and rollover preserve squad development and correct table totals", () => {
  let c = newCareer();
  c = upgrade(c, c.players[0].id, "pace");
  for (let i = 0; i < 30; i++) c = finishMatch(c, result(`round-${i}`));
  assert.ok(c.table.every((t) => t.played === 30));
  const oldCoins = c.coins;
  c = nextSeason(c);
  assert.equal(c.season, 2);
  assert.equal(c.round, 0);
  assert.ok(c.table.every((t) => t.played === 0));
  assert.equal(c.players[0].upgrades, 1);
  assert.ok(c.coins > oldCoins);
  careerSchema.parse(c);
});
test("save validator rejects a corrupt lineup and invalid settings", () => {
  const c = newCareer();
  c.lineup[1] = c.lineup[0];
  assert.equal(careerSchema.safeParse(c).success, false);
  assert.equal(
    settingsSchema.safeParse({ ...DEFAULT_SETTINGS, duration: 90 }).success,
    false,
  );
});
test("shots crossing between the posts score exactly once", () => {
  const m = setup();
  m.phase = "playing";
  m.owner = null;
  m.lastKicker = m.players[9];
  m.ball = { x: 52.4, z: 1, y: 0.5, vx: 30, vz: 0, vy: 0 };
  m.update(1 / 60, emptyInput());
  assert.equal(m.score[0], 1);
  assert.equal(m.phase, "goal");
  for (let i = 0; i < 30; i++) m.update(1 / 60, emptyInput());
  assert.equal(m.score[0], 1);
});
test("out of bounds gives a corner, goal kick, or throw to the correct side", () => {
  for (const [lastTouch, z, label, team] of [
    [1, 15, "CORNER", 0],
    [0, 15, "GOAL KICK", 1],
  ] as const) {
    const m = setup();
    m.phase = "playing";
    m.owner = null;
    m.lastTouch = lastTouch;
    m.ball = { x: 52.4, z, y: 0.5, vx: 30, vz: 0, vy: 0 };
    m.update(1 / 60, emptyInput());
    assert.equal(m.restartLabel, label);
    assert.equal(m.restartTeam, team);
  }
  const m = setup();
  m.phase = "playing";
  m.owner = null;
  m.lastTouch = 0;
  m.ball = { x: 10, z: 34.2, y: 0.5, vx: 0, vz: 20, vy: 0 };
  m.update(1 / 60, emptyInput());
  assert.equal(m.restartLabel, "THROW IN");
  assert.equal(m.restartTeam, 1);
});
test("offside is enforced on involvement, not simply standing beyond the line", () => {
  const m = setup();
  m.phase = "playing";
  const p = m.players[9];
  m.offsideIds.add(p.data.id);
  m.giveBall(p);
  assert.equal(m.phase, "restart");
  assert.equal(m.restartLabel, "OFFSIDE");
  assert.equal(m.restartTeam, 1);
});
test("substitution rules forbid replacing red cards, returning players, and a sixth sub", () => {
  const m = setup(),
    bench = roster(CLUBS[0]).slice(11);
  m.players[2].red = true;
  assert.throws(() => m.substitute(m.players[2].data.id, bench[1]), /sent-off/);
  const id = m.players[3].data.id;
  m.substitute(id, bench[1]);
  assert.equal(m.subs[0], 1);
  assert.ok(m.used.has(id));
  assert.throws(() => m.substitute(m.players[4].data.id, bench[1]), /re-enter/);
  m.subs[0] = 5;
  assert.throws(() => m.substitute(m.players[4].data.id, bench[2]), /five/);
});
test("AI simulation stays finite and reaches halftime after three real minutes", () => {
  const m = setup();
  m.phase = "playing";
  m.pass(m.owner!);
  for (let i = 0; i < 18000 && String(m.phase) !== "halftime"; i++) {
    const p = m.controlled,
      b = m.ball;
    const dx = b.x - p.x,
      dz = b.z - p.z,
      l = Math.hypot(dx, dz);
    const input = {
      ...emptyInput(),
      x: dx / (l || 1),
      z: dz / (l || 1),
      pass: i % 140 === 0,
      shoot: i % 210 === 0,
      tackle: i % 120 === 0,
    };
    m.update(1 / 60, input);
  }
  assert.equal(m.phase, "halftime");
  assert.ok(
    m.players.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)),
  );
  assert.ok(Number.isFinite(m.ball.x));
  assert.ok(m.shots[0] + m.shots[1] > 0);
});
