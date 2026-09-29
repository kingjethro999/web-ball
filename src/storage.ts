import { z } from "zod";
import {
  type Career,
  type Settings,
  DEFAULT_SETTINGS,
  newCareer,
  FORMATIONS,
} from "./domain";
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const id = z.string().min(1).max(80);
const player = z.object({
  id,
  name: z.string().min(1).max(60),
  position: z.enum([
    "GK",
    "LB",
    "CB",
    "RB",
    "DM",
    "CM",
    "AM",
    "LW",
    "RW",
    "ST",
  ]),
  age: int(16, 60),
  skin: int(0, 4),
  hair: int(0, 3),
  stats: z.object({
    pace: int(1, 99),
    shooting: int(1, 99),
    passing: int(1, 99),
    defending: int(1, 99),
    stamina: int(1, 99),
    keeping: int(1, 99),
  }),
  upgrades: int(0, 10),
  fitness: z.number().min(0).max(100),
  injury: int(0, 100),
  suspension: int(0, 100),
  yellows: int(0, 20),
  goals: int(0, 100000),
  assists: int(0, 100000),
});
const score = z.tuple([int(0, 1000), int(0, 1000)]);
export const careerSchema = z
  .object({
    version: z.literal(1),
    manager: z.string().min(1).max(40),
    club: int(0, 15),
    coins: int(0, 100000000),
    season: int(1, 10000),
    round: int(0, 30),
    formation: z.string().refine((x) => !!FORMATIONS[x]),
    lineup: z.array(id).length(11),
    bench: z.array(id).max(7),
    players: z.array(player).min(11).max(35),
    market: z.array(player).max(12),
    fixtures: z
      .array(
        z
          .array(
            z.object({
              home: int(0, 15),
              away: int(0, 15),
              score: score.optional(),
            }),
          )
          .length(8),
      )
      .length(30),
    table: z
      .array(
        z.object({
          club: int(0, 15),
          played: int(0, 30),
          won: int(0, 30),
          drawn: int(0, 30),
          lost: int(0, 30),
          gf: int(0, 30000),
          ga: int(0, 30000),
          points: int(0, 90),
        }),
      )
      .length(16),
    leaguePlayers: z.array(player).max(400),
    history: z
      .array(
        z.object({ id, opponent: int(0, 15), score, coins: int(0, 100000) }),
      )
      .max(30),
    completed: z.array(id).max(300000),
  })
  .superRefine((c, ctx) => {
    const ids = new Set(c.players.map((p) => p.id));
    if (
      ids.size !== c.players.length ||
      new Set([...c.lineup, ...c.bench]).size !==
        c.lineup.length + c.bench.length ||
      [...c.lineup, ...c.bench].some((id) => !ids.has(id))
    )
      ctx.addIssue({ code: "custom", message: "Invalid squad references." });
    if (new Set(c.table.map((t) => t.club)).size !== 16)
      ctx.addIssue({ code: "custom", message: "Invalid league table." });
  });
export const settingsSchema = z
  .object({
    camera: z.enum([
      "broadcast",
      "wide",
      "dynamic",
      "end-to-end",
      "tactical",
      "player",
      "close",
    ]),
    difficulty: z.enum(["casual", "club", "elite"]),
    duration: z.union([
      z.literal(120),
      z.literal(180),
      z.literal(300),
      z.literal(360),
      z.literal(480),
      z.literal(600),
    ]),
    quality: z.enum(["low", "high"]),
    sound: z.boolean(),
    touch: z.boolean(),
  })
  .transform((settings) => ({
    ...settings,
    camera: settings.camera === "close" ? ("wide" as const) : settings.camera,
  }));
const KEY = "web-ball:career:v1";
export function loadCareer(): { career: Career; warning?: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { career: careerSchema.parse(JSON.parse(raw)) };
    return { career: newCareer() };
  } catch {
    try {
      const backup = localStorage.getItem(KEY + ":backup");
      if (backup)
        return {
          career: careerSchema.parse(JSON.parse(backup)),
          warning: "Your last good backup was restored.",
        };
    } catch {}
    return {
      career: newCareer(),
      warning:
        "Your saved career could not be read. A new guest career is ready; the old save has been retained.",
    };
  }
}
export function saveCareer(c: Career) {
  const data = JSON.stringify(careerSchema.parse(c));
  const old = localStorage.getItem(KEY);
  if (old) {
    try {
      careerSchema.parse(JSON.parse(old));
      localStorage.setItem(KEY + ":backup", old);
    } catch {
      /* preserve bad data for manual recovery */ localStorage.setItem(
        KEY + ":unreadable",
        old,
      );
    }
  }
  localStorage.setItem(KEY, data);
}
export function loadSettings(): Settings {
  try {
    const settings = settingsSchema.parse(
      JSON.parse(localStorage.getItem("web-ball:settings") ?? "null"),
    );
    if (!localStorage.getItem("web-ball:six-minute-default")) {
      settings.duration = 360;
      localStorage.setItem("web-ball:six-minute-default", "1");
      localStorage.setItem("web-ball:settings", JSON.stringify(settings));
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export async function api(path: string, body?: unknown, method?: string) {
  const res = await fetch("/api" + path, {
    method: method ?? (body ? "POST" : "GET"),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json().catch(() => ({
    error: "Account server is unavailable. Guest play still works.",
  }));
  if (!res.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}
