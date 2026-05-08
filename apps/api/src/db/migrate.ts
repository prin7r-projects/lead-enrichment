/**
 * Migration runner — reads .sql files from migrations/ and applies them
 * in order, tracking applied versions in the schema_migrations table.
 */
import { sql } from "./client.js";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function appliedVersions(): Promise<Set<string>> {
  const rows = await sql`SELECT version FROM schema_migrations ORDER BY version`;
  return new Set(rows.map(r => r.version as string));
}

async function applyMigration(filename: string) {
  const version = filename.replace(/\.sql$/, "");
  const filepath = join(MIGRATIONS_DIR, filename);
  const sqlText = readFileSync(filepath, "utf-8");

  console.log(`[MIGRATE] Applying ${version}...`);
  await sql.unsafe(sqlText);
  console.log(`[MIGRATE] ${version} applied successfully.`);
}

export async function migrate(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await appliedVersions();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (!applied.has(version)) {
      await applyMigration(file);
    } else {
      console.log(`[MIGRATE] ${version} already applied — skipping.`);
    }
  }

  console.log("[MIGRATE] All migrations complete.");
}

// Run directly
if (process.argv[1] && process.argv[1].includes("migrate")) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("[MIGRATE] Fatal:", err);
      process.exit(1);
    });
}
