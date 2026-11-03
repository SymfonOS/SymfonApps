import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../../src/main/db';
import { ProjectService } from '../../src/main/project';
import { RunService, splitArgs } from '../../src/main/run';
import { detectSourcePaths } from '../../src/main/lsp';
import { schemas } from '../../src/main/schemas';

test('splitArgs honours double quotes', () => {
  assert.deepEqual(splitArgs(''), []);
  assert.deepEqual(splitArgs('-Xmx1g  --name "Ada Lovelace" x'), ['-Xmx1g', '--name', 'Ada Lovelace', 'x']);
});

test('detectSourcePaths prefers Maven/Gradle layout over a bare src', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mini-idea-src-'));
  try {
    assert.deepEqual(detectSourcePaths(dir), []);
    mkdirSync(path.join(dir, 'src'));
    assert.deepEqual(detectSourcePaths(dir), ['src']);
    mkdirSync(path.join(dir, 'src/main/java'), { recursive: true });
    mkdirSync(path.join(dir, 'src/test/java'), { recursive: true });
    assert.deepEqual(detectSourcePaths(dir), ['src/main/java', 'src/test/java']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('run config from a file: main class, package and source root; reused on second call', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mini-idea-run-'));
  try {
    mkdirSync(path.join(dir, 'src/com/acme'), { recursive: true });
    writeFileSync(path.join(dir, 'src/com/acme/App.java'), 'package com.acme;\npublic class App { public static void main(String[] a) {} }\n');
    writeFileSync(path.join(dir, 'src/com/acme/Util.java'), 'package com.acme;\nclass Util {}\n');
    const db = openDb(':memory:');
    const projects = new ProjectService(db, () => undefined);
    const { project } = await projects.open(dir);
    const runs = new RunService(db, (id) => projects.get(id).rootPath, { output() {}, status() {} }, (id, rel) => projects.resolveReal(id, rel));

    const cfg = await runs.fromContext(project.id, 'src/com/acme/App.java');
    assert.ok(cfg);
    assert.deepEqual(cfg.options, { mainClass: 'com.acme.App', sourceRoot: 'src' });
    assert.equal(cfg.temporary, true);
    const again = await runs.fromContext(project.id, 'src/com/acme/App.java');
    assert.equal(again?.id, cfg.id);
    assert.equal(runs.list(project.id).length, 1);

    assert.equal(await runs.fromContext(project.id, 'src/com/acme/Util.java'), null, 'no main method');
    assert.equal(await runs.fromContext(project.id, 'README.md'), null, 'not java');
    await assert.rejects(runs.fromContext(project.id, '../../etc/passwd.java'), /outside project/);
    projects.dispose();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every IPC channel rejects malformed input', () => {
  assert.throws(() => schemas['fs.readFile'].parse({ projectId: 'p' }));
  assert.throws(() => schemas['fs.readFile'].parse({ projectId: '', path: 'a' }));
  assert.throws(() => schemas['fs.writeFile'].parse({ projectId: 'p', path: 'a', content: 1, expectedMtime: null }));
  assert.throws(() => schemas['lsp.start'].parse({ projectId: 'p', languageId: 'cobol' }));
  assert.throws(() => schemas['project.open'].parse({ path: 'x'.repeat(5000) }));
  assert.throws(() => schemas['editorState.save'].parse({ projectId: 'p', tabs: Array.from({ length: 201 }, () => ({ filePath: 'a', active: false, viewState: {} })) }));
  assert.doesNotThrow(() => schemas['fs.readFile'].parse({ projectId: 'p', path: 'src/A.java' }));
  assert.doesNotThrow(() => schemas['project.list'].parse(undefined));
});

test('javaEnv adds a UTF-8 locale only when the app has none (BUG-003/004)', async () => {
  const { javaEnv, hasUtf8Locale } = await import('../../src/main/java-env');
  assert.equal(javaEnv({ PATH: '/bin' }, 'linux').LC_ALL, 'C.UTF-8');
  assert.equal(javaEnv({ LANG: 'POSIX' }, 'linux').LC_ALL, 'C.UTF-8');
  assert.equal(javaEnv({}, 'darwin').LC_CTYPE, 'UTF-8');
  assert.equal(javaEnv({ LANG: 'de_DE.UTF-8' }, 'linux').LC_ALL, undefined, 'keep the user locale');
  assert.equal(javaEnv({ LC_ALL: 'C', LANG: 'de_DE.UTF-8' }, 'linux').LC_ALL, 'C.UTF-8', 'LC_ALL=C wins over LANG');
  assert.equal(javaEnv({}, 'win32').LC_ALL, undefined);
  assert.equal(hasUtf8Locale({ LC_CTYPE: 'en_US.utf8' }), true);
});
