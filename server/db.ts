import "dotenv/config";
import pg from "pg";
export const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;
export const migration = `
CREATE SCHEMA IF NOT EXISTS webball;
CREATE TABLE IF NOT EXISTS webball.users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL,
 password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS webball.sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES webball.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON webball.sessions(expires_at);
CREATE TABLE IF NOT EXISTS webball.saves (
 user_id uuid PRIMARY KEY REFERENCES webball.users(id) ON DELETE CASCADE,
 career jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);`;
export async function migrate() {
  if (!pool)
    throw new Error("Set DATABASE_URL in .env before running migrations.");
  await pool.query(migration);
}
