import express from "express";
import {
  randomBytes,
  randomUUID,
  scrypt as rawScrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { careerSchema } from "../src/storage";
const scrypt = promisify(rawScrypt);
export type Database = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
};
export function createApp(
  pool: Database | null,
  origin = "http://localhost:5173",
  production = false,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    if (req.path.startsWith("/api")) {
      res.setHeader("Cache-Control", "no-store");
      if (!["GET", "HEAD"].includes(req.method)) {
        if (req.headers.origin !== origin) {
          res.status(403).json({ error: "Request origin is not allowed." });
          return;
        }
        if (!req.is("application/json")) {
          res.status(415).json({ error: "Send JSON requests." });
          return;
        }
      }
    }
    next();
  });
  app.use(express.json({ limit: "512kb" }));
  const credentials = z.object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(1).max(40).optional(),
  });
  const attempts = new Map<string, { count: number; until: number }>();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key);
  }, 60000);
  cleanup.unref();
  function throttle(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    const key = req.ip ?? "unknown",
      now = Date.now();
    let entry = attempts.get(key);
    if (!entry || entry.until < now) {
      entry = { count: 0, until: now + 15 * 60 * 1000 };
      attempts.set(key, entry);
    }
    if (++entry.count > 20) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((entry.until - now) / 1000)),
      );
      res
        .status(429)
        .json({ error: "Too many attempts. Try again in 15 minutes." });
      return;
    }
    next();
  }
  function token(req: express.Request) {
    return req.headers.cookie
      ?.split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("webball_session="))
      ?.slice(16);
  }
  function digest(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
  async function session(req: express.Request) {
    const t = token(req);
    if (!pool || !t || !/^[a-f0-9]{64}$/.test(t)) return null;
    const { rows } = await pool.query(
      "SELECT u.id,u.name,u.email FROM webball.sessions s JOIN webball.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [digest(t)],
    );
    return rows[0] ?? null;
  }
  async function newSession(res: express.Response, userId: string) {
    const t = randomBytes(32).toString("hex");
    await pool!.query(
      "INSERT INTO webball.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",
      [digest(t), userId],
    );
    res.cookie("webball_session", t, {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      maxAge: 30 * 24 * 3600 * 1000,
      path: "/",
    });
  }
  const wrap =
    (
      fn: (req: express.Request, res: express.Response) => Promise<unknown>,
    ): express.RequestHandler =>
    (req, res, next) => {
      void fn(req, res).catch(next);
    };
  app.get(
    "/api/health",
    wrap(async (_req, res) => {
      if (!pool) return res.json({ ok: true, database: false });
      try {
        await pool.query("SELECT 1 FROM webball.users LIMIT 1");
        res.json({ ok: true, database: true });
      } catch {
        res.json({ ok: true, database: false });
      }
    }),
  );
  app.get(
    "/api/me",
    wrap(async (req, res) => {
      const user = await session(req);
      if (!user) return res.json({ user: null, revision: 0 });
      const { rows } = await pool!.query(
        "SELECT revision FROM webball.saves WHERE user_id=$1",
        [user.id],
      );
      return res.json({ user, revision: rows[0]?.revision ?? 0 });
    }),
  );
  app.post(
    "/api/register",
    throttle,
    wrap(async (req, res) => {
      if (!pool)
        return res
          .status(503)
          .json({ error: "Accounts are not configured. Continue as guest." });
      const input = credentials.parse(req.body);
      if (!input.name)
        return res.status(400).json({ error: "A manager name is required." });
      const salt = randomBytes(16).toString("hex"),
        key = (await scrypt(input.password, salt, 64)) as Buffer;
      const user = { id: randomUUID(), email: input.email, name: input.name };
      try {
        await pool.query(
          "INSERT INTO webball.users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",
          [user.id, user.email, user.name, `${salt}:${key.toString("hex")}`],
        );
      } catch (e) {
        if ((e as { code?: string }).code === "23505")
          return res
            .status(409)
            .json({
              error: "This email already has an account. Sign in instead.",
            });
        throw e;
      }
      await newSession(res, user.id);
      return res.status(201).json({ user, revision: 0 });
    }),
  );
  app.post(
    "/api/login",
    throttle,
    wrap(async (req, res) => {
      if (!pool)
        return res
          .status(503)
          .json({ error: "Accounts are not configured. Continue as guest." });
      const input = credentials.parse(req.body);
      const { rows } = await pool.query(
        "SELECT id,name,email,password_hash FROM webball.users WHERE email=$1",
        [input.email],
      );
      const row = rows[0];
      const [salt, hash] = (
        row?.password_hash ??
        "00000000000000000000000000000000:" + "00".repeat(64)
      ).split(":");
      const actual = (await scrypt(input.password, salt, 64)) as Buffer;
      const expected = Buffer.from(hash, "hex");
      if (
        !row ||
        expected.length !== actual.length ||
        !timingSafeEqual(actual, expected)
      )
        return res
          .status(401)
          .json({ error: "Email or password is incorrect." });
      const old = token(req);
      if (old)
        await pool.query("DELETE FROM webball.sessions WHERE token_hash=$1", [
          digest(old),
        ]);
      await newSession(res, row.id);
      const save = await pool.query(
        "SELECT revision FROM webball.saves WHERE user_id=$1",
        [row.id],
      );
      return res.json({
        user: { id: row.id, name: row.name, email: row.email },
        revision: save.rows[0]?.revision ?? 0,
      });
    }),
  );
  app.post(
    "/api/logout",
    wrap(async (req, res) => {
      const t = token(req);
      if (pool && t)
        await pool.query("DELETE FROM webball.sessions WHERE token_hash=$1", [
          digest(t),
        ]);
      res.clearCookie("webball_session", {
        httpOnly: true,
        secure: production,
        sameSite: "strict",
        path: "/",
      });
      res.json({ ok: true });
    }),
  );
  app.get(
    "/api/save",
    wrap(async (req, res) => {
      const user = await session(req);
      if (!user)
        return res.status(401).json({ error: "Sign in to load a career." });
      const { rows } = await pool!.query(
        "SELECT career,revision FROM webball.saves WHERE user_id=$1",
        [user.id],
      );
      return res.json(rows[0] ?? { career: null, revision: 0 });
    }),
  );
  app.put(
    "/api/save",
    wrap(async (req, res) => {
      const user = await session(req);
      if (!user)
        return res.status(401).json({ error: "Sign in to save your career." });
      const input = z
        .object({ career: careerSchema, revision: z.number().int().min(0) })
        .parse(req.body);
      const result = await pool!.query(
        `INSERT INTO webball.saves(user_id,career,revision) SELECT $1,$2,1 WHERE $3=0 ON CONFLICT(user_id) DO NOTHING RETURNING revision`,
        [user.id, JSON.stringify(input.career), input.revision],
      );
      if (result.rows[0]) return res.json(result.rows[0]);
      const update = await pool!.query(
        "UPDATE webball.saves SET career=$1,revision=revision+1,updated_at=now() WHERE user_id=$2 AND revision=$3 RETURNING revision",
        [JSON.stringify(input.career), user.id, input.revision],
      );
      if (!update.rows[0])
        return res
          .status(409)
          .json({
            error: "A newer account save exists. Load it before saving again.",
          });
      return res.json(update.rows[0]);
    }),
  );
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });
  const dist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../dist",
  );
  app.use(express.static(dist, { maxAge: production ? "1h" : 0 }));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid account or career data." });
        return;
      }
      const status = (error as { status?: number })?.status;
      if (status === 413) {
        res.status(413).json({ error: "This save is too large." });
        return;
      }
      if (status === 400) {
        res.status(400).json({ error: "Invalid JSON." });
        return;
      }
      console.error(
        "Request failed:",
        (error as { code?: string })?.code ?? "internal",
      );
      res
        .status(500)
        .json({
          error:
            "The account service is unavailable. Guest progress is safe on this device.",
        });
    },
  );

  return app;
}
