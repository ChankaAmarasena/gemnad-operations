// Applies drizzle/*.sql in filename order, each in its own transaction, and
// records name + checksum in _migrations. Refuses to run if an already
// applied file was edited: schema changes always go in a new migration.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const path = resolve(process.env.DATABASE_PATH || 'data/gemnad.db');
const folder = resolve(process.argv[2] || 'drizzle');
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');

const applied = new Map(db.prepare('SELECT name, checksum FROM _migrations').all().map(r => [r.name, r.checksum]));
const files = readdirSync(folder).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort();
let count = 0;
for (const name of files) {
  const sql = readFileSync(join(folder, name), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  if (applied.has(name)) {
    if (applied.get(name) !== checksum) throw new Error(`${name} was changed after it was applied. Revert it and add a new migration instead.`);
    continue;
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name, checksum, applied_at) VALUES (?, ?, ?)').run(name, checksum, new Date().toISOString());
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw new Error(`${name} failed and was rolled back: ${e.message}`);
  }
  console.log(`applied ${name}`);
  count++;
}
console.log(count ? `${count} migration(s) applied to ${path}` : `database is up to date (${path})`);
db.close();
