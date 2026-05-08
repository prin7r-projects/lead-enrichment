/**
 * PostgreSQL connection pool.
 *
 * Uses the `postgres` package which is Bun-compatible and
 * provides a lightweight tagged-template query interface.
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://triangulate:triangulate_dev@localhost:5432/triangulate";

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: postgres.camel
});

export async function checkConnection(): Promise<boolean> {
  try {
    const [row] = await sql`SELECT 1 AS ok`;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  await sql.end();
}
