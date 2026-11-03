// The access boundary: the renderer may only touch files inside an open project,
// and one project's state is not visible through another project's id.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../../src/main/db';
import { ProjectService } from '../../src/main/project';

function setup() {
  const base = mkdtempSync(path.join(tmpdir(), 'mini-idea-proj-'));
  const a = path.join(base, 'alpha');
  const b = path.join(base, 'alpha-evil'); // shares the prefix "alpha"
  mkdirSync(path.join(a, 'src'), { recursive: true });
  mkdirSync(b);
  writeFileSync(path.join(a, 'src', 'A.java'), 'class A {}\n');
  writeFileSync(path.join(b, 'secret.txt'), 'nope');
  writeFileSync(path.join(base, 'outside.txt'), 'nope');
  const svc = new ProjectService(openDb(':memory:'), () => undefined);
  return { base, a, b, svc, done: () => { svc.dispose(); rmSync(base, { recursive: true, force: true }); } };
}

test('paths that leave the project are refused', async () => {
  const { a, svc, done } = setup();
  try {
    const { project } = await svc.open(a);
    for (const bad of ['../outside.txt', '../alpha-evil/secret.txt', '/etc/passwd', 'src/../../outside.txt']) {
      await assert.rejects(svc.readFile(project.id, bad), /outside project/, bad);
      await assert.rejects(svc.writeFile(project.id, bad, 'x', null), /outside project/, bad);
      await assert.rejects(svc.readDir(project.id, bad), /outside project/, bad);
    }
    assert.equal((await svc.readFile(project.id, 'src/A.java')).content, 'class A {}\n');
  } finally {
    done();
  }
});

test('a symlink inside the project that points outside is refused', async () => {
  const { base, a, svc, done } = setup();
  try {
    symlinkSync(path.join(base, 'outside.txt'), path.join(a, 'link.txt'));
    symlinkSync(base, path.join(a, 'linkdir'));
    const { project } = await svc.open(a);
    await assert.rejects(svc.readFile(project.id, 'link.txt'), /symlink/);
    await assert.rejects(svc.writeFile(project.id, 'link.txt', 'x', null), /symlink/);
    await assert.rejects(svc.readDir(project.id, 'linkdir'), /symlink/);
    await assert.rejects(svc.writeFile(project.id, 'linkdir/new.txt', 'x', null), /symlink/);
    assert.equal(readFileSync(path.join(base, 'outside.txt'), 'utf8'), 'nope');
  } finally {
    done();
  }
});

test('a symlink that stays inside the project works', async () => {
  const { a, svc, done } = setup();
  try {
    symlinkSync(path.join(a, 'src'), path.join(a, 'src-link'));
    const { project } = await svc.open(a);
    assert.equal((await svc.readFile(project.id, 'src-link/A.java')).content, 'class A {}\n');
  } finally {
    done();
  }
});

test('unknown project ids get nothing', async () => {
  const { a, svc, done } = setup();
  try {
    await svc.open(a);
    await assert.rejects(svc.readFile('not-a-project', 'src/A.java'), /unknown project/);
    assert.deepEqual(svc.loadEditorState('not-a-project'), []);
  } finally {
    done();
  }
});

test("a second project does not see the first one's editor state, and removal cascades", async () => {
  const { a, b, svc, done } = setup();
  try {
    const p1 = (await svc.open(a)).project;
    const p2 = (await svc.open(b)).project;
    svc.saveEditorState(p1.id, [{ filePath: 'src/A.java', active: true, viewState: {} }]);
    assert.deepEqual(svc.loadEditorState(p2.id), []);
    assert.equal(svc.loadEditorState(p1.id).length, 1);
    svc.remove(p1.id);
    assert.deepEqual(svc.loadEditorState(p1.id), []);
  } finally {
    done();
  }
});

test('new projects are untrusted until the user says so; reopening keeps the decision', async () => {
  const { a, svc, done } = setup();
  try {
    const first = await svc.open(a);
    assert.equal(first.needsTrust, true);
    svc.trust(first.project.id);
    const again = await svc.open(a);
    assert.equal(again.needsTrust, false);
    assert.equal(again.project.id, first.project.id);
  } finally {
    done();
  }
});

test('saving over an externally changed file reports a conflict instead of overwriting', async () => {
  const { a, svc, done } = setup();
  try {
    const { project } = await svc.open(a);
    const file = await svc.readFile(project.id, 'src/A.java');
    writeFileSync(path.join(a, 'src', 'A.java'), 'class A { int changedOutside; }\n');
    const later = new Date(Date.now() + 5000);
    utimesSync(path.join(a, 'src', 'A.java'), later, later);
    const res = await svc.writeFile(project.id, 'src/A.java', 'class A { int mine; }\n', file.mtime);
    assert.ok('conflict' in res);
    assert.equal(readFileSync(path.join(a, 'src', 'A.java'), 'utf8'), 'class A { int changedOutside; }\n');
    const forced = await svc.writeFile(project.id, 'src/A.java', 'class A { int mine; }\n', null);
    assert.ok('mtime' in forced);
    assert.equal(readFileSync(path.join(a, 'src', 'A.java'), 'utf8'), 'class A { int mine; }\n');
  } finally {
    done();
  }
});
