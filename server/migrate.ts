import { migrate, pool } from "./db";
try {
  await migrate();
  console.log(
    "Web Ball schema is ready. Existing schemas and data were not modified.",
  );
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
