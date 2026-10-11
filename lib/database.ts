import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { wrapDatabase, type Database } from './sqlite-d1';

// One connection per server process. Schema changes are applied by
// `npm run migrate` (scripts/migrate.mjs), never at request time.
const cache = globalThis as unknown as { gemnadDatabase?: Database };

export function databasePath() { return resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH || 'data/gemnad.db'); }

export function database(): Database {
 if (!cache.gemnadDatabase) {
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;');
  cache.gemnadDatabase = wrapDatabase(db);
 }
 return cache.gemnadDatabase;
}
