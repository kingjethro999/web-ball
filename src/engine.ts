import {
  type Player,
  type Settings,
  type MatchResult,
  SHAPES,
  FORMATIONS,
  rng,
  fit,
} from "./domain";
export const LENGTH = 105,
  WIDTH = 68,
  GOAL = 7.32;
// 22 cm diameter: 69.1 cm circumference. Shared by physics and rendering.
export const BALL_RADIUS = 0.11;
export type Vec = { x: number; z: number };
export type VisualAction =
  "idle" | "pass" | "shoot" | "lob" | "tackle" | "gk_catch";
export type Footballer = {
  data: Player;
  team: number;
  slot: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  energy: number;
  yellow: number;
  red: boolean;
  injured: boolean;
  action: number;
  actionKind: VisualAction;
  cooldown: number;
  number: number;
};
export type Input = {
  x: number;
  z: number;
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  lob: boolean;
  switch: boolean;
  tackle: boolean;
};
export const emptyInput = (): Input => ({
  x: 0,
  z: 0,
  sprint: false,
  pass: false,
  shoot: false,
  lob: false,
  switch: false,
  tackle: false,
});
export type Event = {
  minute: number;
  text: string;
  kind: "goal" | "card" | "restart" | "info";
  team?: number;
};
export type Phase =
  "kickoff" | "playing" | "restart" | "goal" | "halftime" | "finished";
export class Match {
  id: string;
  players: Footballer[] = [];
  ball = { x: 0, z: 0, y: BALL_RADIUS, vx: 0, vz: 0, vy: 0 };
  owner: Footballer | null = null;
  selected = 9;
  score: [number, number] = [0, 0];
  clock = 0;
  half = 1;
  phase: Phase = "kickoff";
  phaseTime = 2.8;
  restartLabel = "KICK OFF";
  restartTeam = 0;
  restartPos: Vec = { x: 0, z: 0 };
  lastTouch = 0;
  lastKicker: Footballer | null = null;
  ballLock = 0;
  events: Event[] = [];
  goals: MatchResult["goals"] = [];
  cards: MatchResult["cards"] = [];
  injuries: string[] = [];
  shots = [0, 0];
  passes = [0, 0];
  tackles = [0, 0];
  possession = [0, 0];
  saves = [0, 0];
  formations = ["4-3-3", "4-3-3"];
  tactics = ["balanced", "balanced"];
  subs = [0, 0];
  used = new Set<string>();
  offsideIds = new Set<string>();
  lastPass: Footballer | null = null;
  assistCandidate: Footballer | null = null;
  shotTeam: number | null = null;
  settings: Settings;
  random: () => number;
  restartTaker: Footballer | null = null;
  tick = 0;
  forfeited = false;
  restartExempt = false;
  departedFitness: Record<string, number> = {};
  constructor(
    home: Player[],
    away: Player[],
    settings: Settings,
    formation = "4-3-3",
    id: string = matchId(),
  ) {
    this.id = id;
    this.settings = { ...settings };
    this.random = rng(Date.now() % 2147483647);
    this.formations[0] = formation;
    [home, away].forEach((team, t) =>
      team.forEach((data, i) =>
        this.players.push({
          data: structuredClone(data),
          team: t,
          slot: i,
          x: 0,
          z: 0,
          vx: 0,
          vz: 0,
          facing: t === 0 ? Math.PI / 2 : -Math.PI / 2,
          energy: data.fitness,
          yellow: 0,
          red: false,
          injured: false,
          action: 0,
          actionKind: "idle",
          cooldown: 0,
          number: i + 1,
        }),
      ),
    );
    this.resetPositions(0);
    this.event("Kick-off · attack to the right", "info");
  }
  direction(team: number) {
    return (team === 0 ? 1 : -1) * (this.half === 1 ? 1 : -1);
  }
  get minute() {
    return Math.min(90, Math.floor((this.clock / this.settings.duration) * 90));
  }
  get active() {
    return this.players.filter((p) => !p.red && !p.injured);
  }
  get controlled() {
    return this.players[this.selected];
  }
  event(text: string, kind: Event["kind"], team?: number) {
    this.events.unshift({ minute: this.minute, text, kind, team });
    this.events = this.events.slice(0, 40);
  }
  resetPositions(kicking: number) {
    for (const p of this.active) {
      const [a, b] = SHAPES[this.formations[p.team]][p.slot];
      const d = this.direction(p.team);
      p.x = (a * LENGTH - LENGTH / 2) * d * 0.9;
      p.z = (b * WIDTH - WIDTH / 2) * 0.9;
      p.vx = p.vz = 0;
      if (p.slot > 0 && p.x * d > -2) p.x = -2 * d - Math.abs(p.z) * 0.12;
    }
    this.restartExempt = false;
    this.ball = { x: 0, z: 0, y: BALL_RADIUS, vx: 0, vz: 0, vy: 0 };
    this.owner = null;
    this.lastPass = null;
    this.assistCandidate = null;
    this.offsideIds.clear();
    const taker = this.active
      .filter((p) => p.team === kicking && p.slot > 0)
      .sort((a, b) => b.slot - a.slot)[1];
    if (taker) {
      taker.x = -0.7 * this.direction(kicking);
      taker.z = 0;
      this.owner = taker;
      if (!kicking) this.selected = this.players.indexOf(taker);
    }
    this.lastTouch = kicking;
    this.ballLock = 0.6;
  }
  resumeHalf() {
    if (this.phase !== "halftime") return;
    this.half = 2;
    this.phase = "kickoff";
    this.phaseTime = 2.8;
    this.restartLabel = "SECOND HALF";
    this.resetPositions(1);
    this.event("Second half · ends switched", "info");
  }
  changeFormation(formation: string) {
    if (FORMATIONS[formation]) this.formations[0] = formation;
  }
  substitute(outId: string, incoming: Player) {
    const p = this.players.find((p) => p.team === 0 && p.data.id === outId);
    if (!p || p.red) throw new Error("A sent-off player cannot be replaced.");
    if (this.subs[0] >= 5)
      throw new Error("All five substitutions have been used.");
    if (
      this.used.has(incoming.id) ||
      this.players.some((x) => x.data.id === incoming.id)
    )
      throw new Error("This player cannot re-enter the match.");
    if (incoming.injury || incoming.suspension)
      throw new Error("This player is unavailable.");
    if ((p.slot === 0) !== (incoming.position === "GK"))
      throw new Error("Replace your goalkeeper with another goalkeeper.");
    this.departedFitness[outId] = p.energy;
    this.used.add(outId);
    this.event(`${incoming.name} replaces ${p.data.name}`, "info", 0);
    p.data = structuredClone(incoming);
    p.energy = incoming.fitness;
    p.yellow = 0;
    p.injured = false;
    this.subs[0]++;
  }
  choosePlayer() {
    const candidates = this.active.filter((p) => p.team === 0 && p.slot !== 0);
    if (!candidates.length) return;
    const sorted = candidates.sort(
      (a, b) => dist(a, this.ball) - dist(b, this.ball),
    );
    let p = sorted[0];
    if (p === this.controlled && sorted[1]) p = sorted[1];
    this.selected = this.players.indexOf(p);
  }
  giveBall(p: Footballer) {
    if (this.offsideIds.has(p.data.id)) {
      this.restart("OFFSIDE", 1 - p.team, { x: p.x, z: p.z });
      return;
    }
    if (this.lastKicker && this.lastKicker.team !== p.team) {
      this.restartExempt = false;
      this.lastPass = null;
      this.assistCandidate = null;
    }
    this.owner = p;
    this.lastTouch = p.team;
    this.ball.vx = this.ball.vz = this.ball.vy = 0;
    this.ball.y = BALL_RADIUS;
    this.offsideIds.clear();
    this.shotTeam = null;
    if (!p.team) this.selected = this.players.indexOf(p);
  }
  kick(
    p: Footballer,
    target: Vec,
    speed: number,
    height: number,
    kind: "shot" | "pass" | "lob",
  ) {
    if (this.owner !== p) return;
    const d = normal(target.x - p.x, target.z - p.z);
    this.owner = null;
    this.lastKicker = p;
    this.lastTouch = p.team;
    this.ball.x = p.x + d.x * 0.95;
    this.ball.z = p.z + d.z * 0.95;
    this.ball.y = 0.3;
    this.ball.vx = d.x * speed;
    this.ball.vz = d.z * speed;
    this.ball.vy = height;
    this.ballLock = 0.2;
    p.action = 0.32;
    p.actionKind = kind === "shot" ? "shoot" : kind;
    p.cooldown = 0.5;
    this.offsideIds.clear();
    this.shotTeam = kind === "shot" ? p.team : null;
    if (kind === "shot") {
      this.shots[p.team]++;
      this.assistCandidate =
        this.lastPass?.team === p.team ? this.lastPass : null;
      this.lastPass = null;
    } else {
      this.passes[p.team]++;
      this.lastPass = p;
      this.assistCandidate = null;
      if (this.restartExempt) {
        this.restartExempt = false;
        return;
      }
      const dir = this.direction(p.team),
        defenders = this.active
          .filter((x) => x.team !== p.team)
          .map((x) => x.x * dir)
          .sort((a, b) => b - a);
      const line = defenders[1] ?? 52.5;
      for (const mate of this.active.filter(
        (x) => x.team === p.team && x !== p,
      )) {
        if (mate.x * dir > 0 && mate.x * dir > line && mate.x * dir > p.x * dir)
          this.offsideIds.add(mate.data.id);
      }
    }
  }
  pass(p: Footballer, lob = false, input?: Input) {
    const dir = this.direction(p.team),
      aim =
        input && Math.hypot(input.x, input.z) > 0.2
          ? normal(input.x, input.z)
          : { x: dir, z: 0 };
    const team = this.active.filter(
      (x) => x.team === p.team && x !== p && x.slot !== 0,
    );
    if (!team.length) return;
    const ranked = team
      .map((m) => {
        const delta = normal(m.x - p.x, m.z - p.z),
          distance = dist(m, p);
        const defenders = this.active.filter((q) => q.team !== p.team);
        const pressure = Math.min(...defenders.map((q) => dist(q, m)));
        return {
          m,
          score:
            (delta.x * aim.x + delta.z * aim.z) * 22 -
            Math.abs(distance - (lob ? 28 : 16)) * 0.5 +
            Math.min(pressure, 12),
        };
      })
      .sort((a, b) => b.score - a.score);
    const mate = ranked[0].m,
      distance = dist(mate, p),
      accuracy = (100 - p.data.stats.passing) * 0.012;
    const speed = lob
      ? Math.max(16, Math.min(26, distance * 0.6))
      : Math.min(29, 14 + distance * 0.4);
    this.kick(
      p,
      {
        x: mate.x + mate.vx * 0.35 + (this.random() - 0.5) * accuracy,
        z: mate.z + mate.vz * 0.35 + (this.random() - 0.5) * accuracy,
      },
      speed,
      lob ? 7.8 : 0,
      lob ? "lob" : "pass",
    );
    if (!p.team) this.selected = this.players.indexOf(mate);
  }
  shoot(p: Footballer, input?: Input) {
    const dir = this.direction(p.team);
    const accuracy = (100 - p.data.stats.shooting) * 0.04;
    const aimZ = (input ? input.z : 0) * 2.4 + (this.random() - 0.5) * accuracy;
    this.kick(
      p,
      { x: dir * 55, z: Math.max(-3.4, Math.min(3.4, aimZ)) },
      25 + p.data.stats.shooting * 0.16,
      1.5 + this.random() * 2.5,
      "shot",
    );
  }
  challenge(p: Footballer, manual = false) {
    const other = this.owner;
    if (
      !other ||
      other.team === p.team ||
      dist(p, other) > 2.8 ||
      p.cooldown > 0
    )
      return;
    p.cooldown = 1.1;
    p.action = 0.4;
    p.actionKind = "tackle";
    const behind = (p.x - other.x) * other.vx + (p.z - other.z) * other.vz < -1;
    const foul = this.random() < (manual ? (behind ? 0.45 : 0.12) : 0.018);
    if (foul) {
      const severe =
        behind && Math.hypot(p.vx, p.vz) > 7 && this.random() < 0.16;
      const reckless = behind || this.random() < 0.35;
      let red = false;
      if (severe) {
        p.red = true;
        this.cards.push({ player: p.data.id, yellow: false, red: true });
        this.event(
          `${p.data.name} · dangerous tackle, red card`,
          "card",
          p.team,
        );
      } else if (reckless) {
        p.yellow++;
        red = p.yellow >= 2;
        p.red = red;
        this.cards.push({ player: p.data.id, yellow: true, red });
        this.event(
          `${p.data.name} · ${red ? "second yellow, sent off" : "yellow card"}`,
          "card",
          p.team,
        );
      }
      if (this.random() < 0.04) {
        other.injured = true;
        this.injuries.push(other.data.id);
        this.event(
          `${other.data.name} · injury, substitute required`,
          "info",
          other.team,
        );
      }
      const dir = this.direction(other.team),
        inBox = other.x * dir > 36 && Math.abs(other.z) < 20.16;
      this.restart(
        inBox ? "PENALTY" : "FREE KICK",
        other.team,
        inBox ? { x: dir * 41.5, z: 0 } : { x: other.x, z: other.z },
      );
      return;
    }
    const success =
      0.38 +
      (p.data.stats.defending - other.data.stats.pace) * 0.007 +
      (manual ? 0.18 : 0);
    if (this.random() < success) {
      this.tackles[p.team]++;
      this.giveBall(p);
      this.ballLock = 0.25;
    }
  }
  restart(label: string, team: number, pos: Vec) {
    this.restartExempt = ["THROW IN", "CORNER", "GOAL KICK"].includes(label);
    this.phase = "restart";
    this.phaseTime = 2.2;
    this.restartLabel = label;
    this.restartTeam = team;
    this.restartPos = {
      x: clamp(pos.x, -52, 52),
      z: clamp(pos.z, -33.5, 33.5),
    };
    this.owner = null;
    this.ball = { ...this.restartPos, y: BALL_RADIUS, vx: 0, vz: 0, vy: 0 };
    this.ballLock = 0.5;
    this.lastPass = null;
    this.assistCandidate = null;
    this.offsideIds.clear();
    this.shotTeam = null;
    this.event(
      label.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
      "restart",
      team,
    );
    const eligible = this.active.filter(
      (p) =>
        p.team === team && (label === "GOAL KICK" ? p.slot === 0 : p.slot > 0),
    );
    const taker = eligible.sort((a, b) => dist(a, pos) - dist(b, pos))[0];
    this.restartTaker = taker ?? null;
    if (taker) {
      taker.x = pos.x - this.direction(team) * 0.6;
      taker.z = pos.z;
    }
    for (const p of this.active) {
      if (p === taker) continue;
      const d = dist(p, pos);
      if (d < 9.15) {
        const n = normal(p.x - pos.x, p.z - pos.z);
        p.x = clamp(pos.x + n.x * 9.5, -51, 51);
        p.z = clamp(pos.z + n.z * 9.5, -33, 33);
      }
    }
    if (label === "PENALTY") {
      const dir = this.direction(team);
      for (const p of this.active) {
        if (p === taker) continue;
        if (p.team !== team && p.slot === 0) {
          p.x = dir * 51.8;
          p.z = 0;
        } else {
          p.x = dir * (30 - this.random() * 4);
          p.z = (this.random() - 0.5) * 28;
        }
      }
    }
    if (taker && !team) this.selected = this.players.indexOf(taker);
  }
  result(): MatchResult {
    return {
      forfeited: this.forfeited,
      id: this.id,
      score: [...this.score],
      goals: this.goals,
      cards: this.cards,
      fitness: {
        ...this.departedFitness,
        ...Object.fromEntries(
          this.players.filter((p) => !p.team).map((p) => [p.data.id, p.energy]),
        ),
      },
      injuries: this.injuries,
    };
  }
  update(dt: number, input: Input) {
    if (this.phase === "finished" || this.phase === "halftime") return;
    this.tick += dt;
    if (this.phase !== "playing") {
      this.phaseTime -= dt;
      if (this.phaseTime <= 0) {
        if (this.phase === "goal") {
          this.resetPositions(this.restartTeam);
          this.phase = "kickoff";
          this.phaseTime = 2;
          this.restartLabel = "KICK OFF";
        } else if (this.phase === "restart") {
          this.phase = "playing";
          if (this.restartTaker) {
            this.giveBall(this.restartTaker);
            if (this.restartTeam === 1) {
              if (this.restartLabel === "PENALTY")
                this.shoot(this.restartTaker);
              else
                this.pass(
                  this.restartTaker,
                  this.restartLabel === "CORNER" ||
                    this.restartLabel === "GOAL KICK",
                );
              this.offsideIds.clear();
            }
          }
        } else this.phase = "playing";
      }
      return;
    }
    this.clock += dt;
    if (this.half === 1 && this.clock >= this.settings.duration / 2) {
      this.clock = this.settings.duration / 2;
      this.phase = "halftime";
      this.event("Half-time", "info");
      return;
    }
    if (this.clock >= this.settings.duration) {
      this.clock = this.settings.duration;
      this.phase = "finished";
      this.event("Full-time", "info");
      return;
    }
    this.ballLock = Math.max(0, this.ballLock - dt);
    if (this.owner) this.possession[this.owner.team] += dt;
    if (input.switch) this.choosePlayer();
    const controlled = this.controlled;
    if (controlled && !controlled.red && !controlled.injured) {
      if (this.owner === controlled) {
        if (input.shoot) this.shoot(controlled, input);
        else if (input.lob) this.pass(controlled, true, input);
        else if (input.pass) this.pass(controlled, false, input);
      } else if (input.tackle || input.pass) this.challenge(controlled, true);
    }
    if (this.phase !== "playing") return;
    for (const p of this.active) {
      if (this.phase !== "playing") return;
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.action = Math.max(0, p.action - dt);
      if (p.action === 0) p.actionKind = "idle";
      let tx = p.x,
        tz = p.z,
        sprint = false;
      const dir = this.direction(p.team),
        isUser = p === controlled;
      if (isUser) {
        tx = p.x + input.x * 8;
        tz = p.z + input.z * 8;
        sprint = input.sprint;
      } else if (p.slot === 0) {
        const goalX = -dir * 50;
        tx = goalX + (this.ball.x * dir < -33 ? dir * 2 : 0);
        tz = clamp(this.ball.z * 0.24, -3.1, 3.1);
        if (this.owner === p) {
          p.cooldown -= dt;
          if (p.cooldown <= 0) {
            this.pass(p, true);
            p.cooldown = 1;
          }
        } else if (
          this.ball.x * dir < -37 &&
          Math.abs(this.ball.z) < 13 &&
          dist(p, this.ball) < 8
        ) {
          tx = this.ball.x;
          tz = this.ball.z;
        }
      } else if (this.owner === p) {
        const defenders = this.active.filter((x) => x.team !== p.team);
        const nearest = Math.min(...defenders.map((q) => dist(p, q)));
        tx = p.x + dir * 9;
        tz = p.z * 0.94;
        const goalDistance = 52.5 - p.x * dir;
        if (
          goalDistance < 25 &&
          Math.abs(p.z) < 20 &&
          p.cooldown <= 0 &&
          this.random() < dt * 2.2
        )
          this.shoot(p);
        else if (
          p.cooldown <= 0 &&
          ((nearest < 4 && this.random() < dt * 2.5) ||
            this.random() < dt * 0.24)
        )
          this.pass(p, this.random() < 0.15);
        sprint = nearest < 6;
      } else {
        const [a, b] = SHAPES[this.formations[p.team]][p.slot];
        const attacking = this.owner?.team === p.team;
        const tactical =
          this.tactics[p.team] === "attacking"
            ? 8
            : this.tactics[p.team] === "defensive"
              ? -8
              : 0;
        tx =
          (a * 105 - 52.5) * dir +
          clamp(this.ball.x * 0.36, -14, 14) +
          (attacking ? 9 : 0) * dir +
          tactical * dir;
        tz = (b * 68 - 34) * 0.87 + this.ball.z * 0.18;
        const field = this.active
          .filter((x) => x.team === p.team && x.slot > 0 && x !== controlled)
          .sort((a, b) => dist(a, this.ball) - dist(b, this.ball));
        if (
          (!this.owner || this.owner.team !== p.team) &&
          field
            .slice(0, this.tactics[p.team] === "pressing" ? 3 : 2)
            .includes(p)
        ) {
          tx = this.ball.x + this.ball.vx * 0.16;
          tz = this.ball.z + this.ball.vz * 0.16;
          sprint = dist(p, this.ball) > 8;
          if (this.owner && dist(p, this.owner) < 2.1) this.challenge(p);
        }
      }
      tx = clamp(tx, -51.7, 51.7);
      tz = clamp(tz, -33.5, 33.5);
      const dx = tx - p.x,
        dz = tz - p.z,
        distance = Math.hypot(dx, dz);
      let speed =
        (4 + p.data.stats.pace * 0.035) *
        (sprint ? 1.32 : 1) *
        (p.energy < 30 ? 0.8 : 1);
      if (p.team === 1)
        speed *=
          this.settings.difficulty === "casual"
            ? 0.83
            : this.settings.difficulty === "elite"
              ? 1.08
              : 0.98;
      if (this.owner === p) speed *= 0.91;
      const wanted = normal(dx, dz);
      const factor = Math.min(1, dt * 10);
      p.vx +=
        ((distance > 0.25 ? wanted.x * Math.min(speed, distance * 4) : 0) -
          p.vx) *
        factor;
      p.vz +=
        ((distance > 0.25 ? wanted.z * Math.min(speed, distance * 4) : 0) -
          p.vz) *
        factor;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (Math.hypot(p.vx, p.vz) > 0.25) p.facing = Math.atan2(p.vx, p.vz);
      const drain =
        (sprint ? 0.13 : 0.035) *
        (100 / p.data.stats.stamina) *
        dt *
        (180 / this.settings.duration);
      p.energy = clamp(p.energy - drain, 0, 100);
    }
    // Soft separation prevents overlapping players while retaining responsive movement.
    const live = this.active;
    for (let i = 0; i < live.length; i++)
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i],
          b = live[j],
          d = dist(a, b);
        if (d < 0.72 && d > 0.001) {
          const push = (0.72 - d) * 0.3,
            n = normal(a.x - b.x, a.z - b.z);
          a.x += n.x * push;
          a.z += n.z * push;
          b.x -= n.x * push;
          b.z -= n.z * push;
        }
      }
    if (this.owner) {
      if (this.owner.red || this.owner.injured) {
        this.owner = null;
      } else {
        const p = this.owner;
        const d =
          Math.hypot(p.vx, p.vz) > 0.2
            ? normal(p.vx, p.vz)
            : { x: this.direction(p.team), z: 0 };
        this.ball.x = p.x + d.x * 0.75;
        this.ball.z = p.z + d.z * 0.75;
        this.ball.y = BALL_RADIUS + Math.abs(Math.sin(this.tick * 14)) * 0.045;
      }
    } else {
      const b = this.ball;
      const prevX = b.x;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y += b.vy * dt;
      b.vy -= 9.81 * dt;
      if (b.y < BALL_RADIUS) {
        b.y = BALL_RADIUS;
        b.vy = Math.abs(b.vy) > 0.8 ? -b.vy * 0.44 : 0;
      }
      const drag = Math.exp(-(b.y > 0.3 ? 0.08 : 0.7) * dt);
      b.vx *= drag;
      b.vz *= drag;
      // Whole ball must cross the line. Posts and crossbar rebound before goal checks.
      if (
        Math.abs(b.x) > 51.95 &&
        Math.abs(b.x) < 53 &&
        Math.abs(Math.abs(b.z) - GOAL / 2) < BALL_RADIUS + 0.06 &&
        b.y < 2.65
      ) {
        b.vx *= -0.65;
        b.x = Math.sign(b.x) * 51.9;
        this.event("Off the post!", "info");
      }
      if (
        Math.abs(b.x) > 51.95 &&
        Math.abs(b.x) < 53 &&
        Math.abs(b.z) < 3.8 &&
        Math.abs(b.y - 2.44) < BALL_RADIUS + 0.06
      ) {
        b.vx *= -0.65;
        b.vy *= -0.5;
        b.x = Math.sign(b.x) * 51.9;
        this.event("Off the crossbar!", "info");
      }
      if (
        Math.abs(b.x) > LENGTH / 2 + BALL_RADIUS &&
        Math.abs(prevX) <= LENGTH / 2 + BALL_RADIUS
      ) {
        if (
          Math.abs(b.z) < GOAL / 2 - BALL_RADIUS &&
          b.y < 2.44 - BALL_RADIUS
        ) {
          const scoring = this.direction(0) === Math.sign(b.x) ? 0 : 1;
          this.score[scoring]++;
          const scorer =
            this.lastKicker ??
            this.players.find((p) => p.team === scoring && p.slot === 9)!;
          const own = scorer.team !== scoring;
          this.goals.push({
            player: own ? "own-goal" : scorer.data.id,
            assist:
              !own && this.assistCandidate && this.assistCandidate !== scorer
                ? this.assistCandidate.data.id
                : undefined,
            team: scoring,
            minute: this.minute,
          });
          this.event(
            `${scorer.data.name}${own ? " (own goal)" : ""}`,
            "goal",
            scoring,
          );
          this.phase = "goal";
          this.phaseTime = 3.2;
          this.restartTeam = 1 - scoring;
          this.restartLabel = "GOAL!";
          this.owner = null;
          return;
        }
        const defending = this.direction(0) === Math.sign(b.x) ? 1 : 0;
        if (this.lastTouch === defending)
          this.restart("CORNER", 1 - defending, {
            x: Math.sign(b.x) * 52,
            z: Math.sign(b.z || 1) * 33.5,
          });
        else
          this.restart("GOAL KICK", defending, {
            x: Math.sign(b.x) * 47,
            z: 0,
          });
        return;
      }
      if (Math.abs(b.z) > WIDTH / 2 + BALL_RADIUS) {
        this.restart("THROW IN", 1 - this.lastTouch, {
          x: clamp(b.x, -51, 51),
          z: Math.sign(b.z) * 33.5,
        });
        return;
      }
      if (this.ballLock <= 0) {
        const candidates = live
          .filter(
            (p) =>
              p.cooldown < 0.35 &&
              dist(p, b) < (p.slot === 0 ? 1.9 : 1.05) &&
              b.y < (p.slot === 0 ? 2.7 : 1.3),
          )
          .sort((a, b) => dist(a, this.ball) - dist(b, this.ball));
        if (candidates[0]) {
          const p = candidates[0];
          if (
            p.slot === 0 &&
            this.shotTeam !== null &&
            this.shotTeam !== p.team
          ) {
            this.saves[p.team]++;
            p.action = 0.6;
            p.actionKind = "gk_catch";
          }
          this.giveBall(p);
          p.cooldown = p.slot === 0 ? 0.8 : 0.1;
        }
      }
    }
    if (this.controlled?.red || this.controlled?.injured) {
      const next = this.active
        .filter((p) => p.team === 0 && p.slot > 0)
        .sort((a, b) => dist(a, this.ball) - dist(b, this.ball))[0];
      if (next) this.selected = this.players.indexOf(next);
    }
  }
}
export function normal(x: number, z: number) {
  const l = Math.hypot(x, z);
  return l > 0.0001 ? { x: x / l, z: z / l } : { x: 1, z: 0 };
}
export function dist(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function matchId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}
