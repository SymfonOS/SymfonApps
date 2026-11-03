// Local state store on node:sqlite with numbered migrations.
// Migration 1 is replica/schema.sql (the architecture's schema). New migrations are
// appended to MIGRATIONS and never edited once released.
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import schemaV1 from '../../../../replica/schema.sql';

export type Db = DatabaseSync;

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/** Pragmas must run outside a transaction, so they are stripped from migration SQL. */
const stripPragmas = (sql: string) => sql.replace(/^\s*pragma\s+[^;]+;\s*$/gim, '');

export const MIGRATIONS: Migration[] = [
  // schema.sql inserts its own schema_version row; the runner keeps it in sync.
  { version: 1, name: 'initial schema', sql: schemaV1 },
];

export function currentVersion(db: Db): number {
  const t = db.prepare("select count(*) as n from sqlite_master where type = 'table' and name = 'schema_version'").get() as { n: number };
  if (t.n === 0) return 0;
  const row = db.prepare('select max(version) as v from schema_version').get() as { v: number | null };
  return row.v ?? 0;
}

/**
 * Applies pending migrations, each in its own transaction.
 * Before touching an existing database it copies the file to `<file>.bak-v<from>`.
 */
export function migrate(db: Db, file: string | null, migrations: Migration[] = MIGRATIONS): { from: number; to: number; backup: string | null } {
  const from = currentVersion(db);
  const latest = migrations.reduce((m, x) => Math.max(m, x.version), 0);
  if (from > latest) {
    throw new Error(`state database is version ${from}, this app only knows up to ${latest}. Update the app or move ${file ?? 'the database'} aside.`);
  }
  const pending = migrations.filter((m) => m.version > from).sort((a, b) => a.version - b.version);
  let backup: string | null = null;
  if (pending.length && from > 0 && file && existsSync(file)) {
    db.exec('pragma wal_checkpoint(truncate);');
    backup = `${file}.bak-v${from}`;
    copyFileSync(file, backup);
  }
  for (const m of pending) {
    db.exec('begin');
    try {
      db.exec(stripPragmas(m.sql));
      db.prepare('delete from schema_version').run();
      db.prepare('insert into schema_version (version) values (?)').run(m.version);
      db.exec('commit');
    } catch (e) {
      db.exec('rollback');
      throw new Error(`migration ${m.version} (${m.name}) failed: ${(e as Error).message}`);
    }
  }
  return { from, to: pending.length ? pending[pending.length - 1]!.version : from, backup };
}

export function openDb(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec('pragma foreign_keys = on;');
  if (file !== ':memory:') db.exec('pragma journal_mode = wal;');
  migrate(db, file === ':memory:' ? null : file);
  return db;
}

export const newId = (): string => randomUUID();
export const now = (): number => Date.now();
