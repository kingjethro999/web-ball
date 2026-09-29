import "dotenv/config";
import { pool } from "./db";
import { createApp, type Database } from "./app";
const production = process.env.NODE_ENV === "production";
if (production && !process.env.APP_ORIGIN)
  throw new Error("APP_ORIGIN is required in production.");
const app = createApp(
  pool as Database | null,
  process.env.APP_ORIGIN ?? "http://localhost:5173",
  production,
);
const server = app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0", () =>
  console.log(
    `Web Ball listening on port ${process.env.PORT ?? 3001}. Accounts ${pool ? "configured" : "disabled (guest mode)"}.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => {
      void pool?.end().finally(() => process.exit(0));
      if (!pool) process.exit(0);
    });
  });
