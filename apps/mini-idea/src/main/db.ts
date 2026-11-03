// Local state store on node:sqlite. Schema source of truth: replica/schema.sql.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import schemaSql from '../../../../replica/schema.sql';

export type Db = DatabaseSync;

export function openDb(file: string): Db {
  const db = new DatabaseSync(file);
  // Pragmas cannot run inside the schema transaction (journal_mode in particular).
  db.exec('pragma foreign_keys = on; pragma journal_mode = wal;');
  const hasSchema = db
    .prepare("select count(*) as n from sqlite_master where type = 'table' and name = 'schema_version'")
    .get() as { n: number };
  if (hasSchema.n === 0) {
    db.exec('begin');
    try {
      db.exec(schemaSql.replace(/^\s*pragma\s+[^;]+;\s*$/gim, ''));
      db.exec('commit');
    } catch (e) {
      db.exec('rollback');
      throw e;
    }
  }
  return db;
}

export const newId = (): string => randomUUID();
export const now = (): number => Date.now();
