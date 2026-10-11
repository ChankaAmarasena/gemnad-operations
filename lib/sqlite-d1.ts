import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

// Minimal D1-compatible facade over node:sqlite so the API code keeps its
// prepare/bind/first/all/run/batch shape. Statements execute synchronously:
// a batch can never interleave with another request's writes.
export type Statement = {
 bind(...args: unknown[]): Statement;
 first<T = Record<string, unknown>>(): Promise<T | null>;
 all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
 run(): Promise<RunResult>;
 runSync(): RunResult;
};
export type RunResult = { meta: { changes: number; last_row_id: number } };
export type Database = { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };

export function wrapDatabase(db: DatabaseSync): Database {
 function statement(sql: string, args: SQLInputValue[] = []): Statement {
  const runSync = (): RunResult => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; };
  return {
   bind: (...a) => statement(sql, a.map(v => v === undefined ? null : v) as SQLInputValue[]),
   first: async <T>() => (db.prepare(sql).get(...args) as T | undefined) ?? null,
   all: async <T>() => ({ results: db.prepare(sql).all(...args) as T[] }),
   run: async () => runSync(),
   runSync,
  };
 }
 return {
  prepare: sql => statement(sql),
  async batch(statements) {
   db.exec('BEGIN IMMEDIATE');
   try { const out = statements.map(s => s.runSync()); db.exec('COMMIT'); return out; }
   catch (e) { db.exec('ROLLBACK'); throw e; }
  },
 };
}
