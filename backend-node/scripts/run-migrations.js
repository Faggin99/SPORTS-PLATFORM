const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureTrackingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations() {
  const r = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(r.rows.map((row) => row.filename));
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s)`);

  // Antes da tabela existir (primeira execução em DB virgem), tudo precisa rodar.
  // Após a primeira execução, schema_migrations vai trackear.
  let applied;
  try {
    await ensureTrackingTable();
    applied = await appliedMigrations();
  } catch (_) {
    applied = new Set();
  }

  let ran = 0;
  let skipped = 0;
  for (const file of files) {
    if (applied.has(file)) {
      skipped++;
      continue;
    }
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      console.log(`  Completed: ${file}`);
      ran++;
    } catch (err) {
      console.error(`  FAILED: ${file}`);
      console.error(`  Error: ${err.message}`);
      throw err;
    }
  }

  console.log(`\n${ran} migration(s) applied, ${skipped} already up to date.`);
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
