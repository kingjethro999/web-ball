import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createApp } from "../server/app";
import { migration } from "../server/db";
import { newCareer } from "../src/domain";
test("accounts: registration, hashed credentials, sessions, save conflicts, isolation and logout", async () => {
  const db = new PGlite();
  await db.exec(migration);
  const app = createApp({
    query: async (text, values) => {
      const result = await db.query(text, values);
      return { rows: result.rows };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const origin = "http://localhost:5173";
  async function request(
    route: string,
    method = "GET",
    body?: unknown,
    cookie?: string,
    site = origin,
  ) {
    const r = await fetch(base + route, {
      method,
      headers: {
        Origin: site,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: (await r.json()) as any,
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    assert.equal((await request("/health")).body.database, true);
    assert.equal(
      (
        await request(
          "/register",
          "POST",
          {
            name: "Tester",
            email: "test@example.com",
            password: "test-password-123",
          },
          undefined,
          "https://untrusted.invalid",
        )
      ).status,
      403,
    );
    const registered = await request("/register", "POST", {
      name: "Tester",
      email: "test@example.com",
      password: "test-password-123",
    });
    assert.equal(registered.status, 201);
    assert.ok(registered.cookie);
    const cookie = registered.cookie!;
    const stored = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM webball.users",
    );
    assert.ok(!stored.rows[0].password_hash.includes("test-password"));
    assert.equal(
      (await request("/me", "GET", undefined, cookie)).body.user.email,
      "test@example.com",
    );
    assert.equal((await request("/save")).status, 401);
    const c = newCareer("Tester");
    const save = await request(
      "/save",
      "PUT",
      { career: c, revision: 0 },
      cookie,
    );
    assert.equal(save.status, 200);
    assert.equal(save.body.revision, 1);
    assert.equal(
      (await request("/save", "PUT", { career: c, revision: 0 }, cookie))
        .status,
      409,
    );
    const second = await request(
      "/save",
      "PUT",
      { career: { ...c, coins: 1900 }, revision: 1 },
      cookie,
    );
    assert.equal(second.body.revision, 2);
    const loaded = await request("/save", "GET", undefined, cookie);
    assert.equal(loaded.body.career.coins, 1900);
    assert.equal(
      (
        await request("/login", "POST", {
          email: "test@example.com",
          password: "wrong-password-123",
        })
      ).status,
      401,
    );
    const login = await request("/login", "POST", {
      email: "test@example.com",
      password: "test-password-123",
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.revision, 2);
    const other = await request("/register", "POST", {
      name: "Other",
      email: "other@example.com",
      password: "different-password-123",
    });
    assert.equal(
      (await request("/save", "GET", undefined, other.cookie)).body.career,
      null,
    );
    assert.equal(
      (
        await request(
          "/save",
          "PUT",
          { career: { ...c, lineup: [] }, revision: 2 },
          login.cookie,
        )
      ).status,
      400,
    );
    await request("/logout", "POST", {}, login.cookie);
    assert.equal(
      (await request("/save", "GET", undefined, login.cookie)).status,
      401,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  }
});
