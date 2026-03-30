#!/bin/sh
set -e

# Run Drizzle migrations using raw SQL files and the __drizzle_migrations tracking table
echo "Running database migrations..."
node -e "
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./data/coffeebook.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  // Ensure migrations tracking table exists
  await client.execute(\`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash text NOT NULL,
    created_at numeric
  )\`);

  // Read journal to get ordered migrations
  const journal = JSON.parse(fs.readFileSync('./drizzle/meta/_journal.json', 'utf8'));
  const applied = await client.execute('SELECT hash FROM __drizzle_migrations');
  const appliedHashes = new Set(applied.rows.map(r => r.hash));

  for (const entry of journal.entries) {
    const sqlFile = path.join('./drizzle', entry.tag + '.sql');
    if (appliedHashes.has(entry.tag)) {
      console.log('Already applied:', entry.tag);
      continue;
    }
    console.log('Applying:', entry.tag);
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        // Skip ALTER TABLE errors for columns that already exist
        if (e.message && e.message.includes('duplicate column')) {
          console.log('  Skipping (already exists):', stmt.substring(0, 60));
        } else if (e.message && e.message.includes('already exists')) {
          console.log('  Skipping (already exists):', stmt.substring(0, 60));
        } else {
          throw e;
        }
      }
    }
    await client.execute({
      sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      args: [entry.tag, Date.now()]
    });
    console.log('Applied:', entry.tag);
  }
  console.log('Migrations complete');
}

migrate().then(() => process.exit(0)).catch(e => { console.error('Migration failed:', e); process.exit(1); });
"

echo "Starting server..."
exec node server.js
