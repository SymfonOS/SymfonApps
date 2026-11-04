import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { currentVersion, migrate, MIGRATIONS, openDb } from '../../src/main/db';

const tmp = () => mkdtempSync(path.join(tmpdir(), 'hobel-db-'));

test('fresh database migrates to the latest version with every table', () => {
  const db = openDb(':memory:');
  assert.equal(currentVersion(db), MIGRATIONS.at(-1)!.version);
  const tables = (db.prepare("select name from sqlite_master where type = 'table'").all() as { name: string }[]).map((r) => r.name);
  for (const t of ['projects', 'settings', 'keybindings', 'editor_states', 'run_configurations', 'run_sessions', 'test_results', 'breakpoints', 'history_entries']) {
    assert.ok(tables.includes(t), `missing table ${t}`);
  }
  const fk = db.prepare('pragma foreign_keys').get() as { foreign_keys: number };
  assert.equal(fk.foreign_keys, 1);
});

test('migrating twice is a no-op', () => {
  const db = openDb(':memory:');
  const r = migrate(db, null);
  assert.deepEqual(r, { from: 1, to: 1, backup: null });
});

test('a new migration backs up the existing file first and runs in order', () => {
  const dir = tmp();
  try {
    const file = path.join(dir, 'state.db');
    openDb(file).close();
    const db = new DatabaseSync(file);
    const r = migrate(db, file, [...MIGRATIONS, { version: 2, name: 'add note', sql: 'alter table projects add column note text;' }]);
    assert.deepEqual(r, { from: 1, to: 2, backup: `${file}.bak-v1` });
    assert.ok(existsSync(`${file}.bak-v1`));
    assert.equal(currentVersion(db), 2);
    db.prepare("insert into projects (id, name, root_path, created_at, updated_at, note) values ('p', 'n', '/x', 0, 0, 'hi')").run();
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a failing migration rolls back and keeps the old version', () => {
  const db = openDb(':memory:');
  assert.throws(() => migrate(db, null, [...MIGRATIONS, { version: 2, name: 'broken', sql: 'create table ok_table(x); select * from no_such_table;' }]), /migration 2/);
  assert.equal(currentVersion(db), 1);
  const t = db.prepare("select count(*) as n from sqlite_master where name = 'ok_table'").get() as { n: number };
  assert.equal(t.n, 0, 'partial migration must be rolled back');
});

test('a database from a newer app version is refused, not damaged', () => {
  const db = openDb(':memory:');
  db.prepare('update schema_version set version = 99').run();
  assert.throws(() => migrate(db, null), /version 99/);
});

test('constraints from the architecture hold', () => {
  const db = openDb(':memory:');
  db.prepare("insert into projects (id, name, root_path, created_at, updated_at) values ('p', 'n', '/x', 0, 0)").run();
  const bp = db.prepare("insert into breakpoints (id, project_id, kind, file_path, line, created_at, updated_at) values (?, 'p', 'line', 'A.java', 3, 0, 0)");
  bp.run('b1');
  assert.throws(() => bp.run('b2'), /UNIQUE/, 'one line breakpoint per line');
  const cl = db.prepare("insert into changelists (id, project_id, name, active, created_at, updated_at) values (?, 'p', ?, 1, 0, 0)");
  cl.run('c1', 'Default');
  assert.throws(() => cl.run('c2', 'Other'), /UNIQUE/, 'one active changelist');
  // Deleting a project removes what it owns.
  db.prepare("delete from projects where id = 'p'").run();
  const left = db.prepare('select (select count(*) from breakpoints) + (select count(*) from changelists) as n').get() as { n: number };
  assert.equal(left.n, 0);
});
