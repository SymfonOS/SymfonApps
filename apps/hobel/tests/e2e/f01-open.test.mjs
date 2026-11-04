// F01 Open an existing project (and the welcome / trust screens around it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertNoErrors, axe, editorText, fixture, launch, openFileInTree, openProject, waitForJava } from './helpers.mjs';

test('F01-H1 open, trust, tree shows the project; screens pass axe', { timeout: 120_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await s.page.getByText('Noch kein Projekt geöffnet').waitFor();
    assert.deepEqual(await axe(s.page), [], 'welcome (empty)');
    await s.page.getByRole('button', { name: 'Ordner öffnen' }).click();
    await s.page.getByRole('dialog').waitFor();
    assert.deepEqual(await axe(s.page), [], 'trust dialog');
    await s.page.getByRole('button', { name: 'Ja, vertrauen' }).click();
    await s.page.getByRole('treeitem', { name: 'src', exact: true }).waitFor();
    assert.deepEqual(await axe(s.page), [], 'workspace');
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F01-E1 empty folder shows an empty state', { timeout: 60_000 }, async () => {
  const fx = fixture();
  rmSync(fx.dir, { recursive: true });
  mkdirSync(fx.dir);
  const s = await launch({ pick: fx.dir });
  try {
    await openProject(s.page);
    await s.page.getByText('Dieser Ordner ist leer.').waitFor();
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F01-E2 project path with spaces, umlauts and emoji: the Java server starts (BUG-003)', { timeout: 240_000 }, async () => {
  const fx = fixture('hello-java', 'Mein Projekt ü 🚀');
  const s = await launch({ pick: fx.dir });
  try {
    await openProject(s.page);
    await waitForJava(s.page);
    // stays up (it used to exit and be restarted 3 times)
    await s.page.waitForTimeout(8000);
    await s.page.getByRole('status').filter({ hasText: /Java: bereit/ }).waitFor({ timeout: 1000 });
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F01-E2b project path with umlauts and emoji: diagnostics arrive', { timeout: 240_000, todo: 'BUG-012 open' }, async () => {
  const fx = fixture('hello-java', 'Mein Projekt ü 🚀');
  const s = await launch({ pick: fx.dir });
  try {
    await openProject(s.page);
    await openFileInTree(s.page, ['src', 'com', 'example', 'Main.java']);
    await waitForJava(s.page);
    await s.page.locator('.monaco-editor .view-lines').click();
    await s.page.keyboard.press('Control+End');
    await s.page.keyboard.type('broken');
    await s.page.getByLabel(/[1-9]\d* Fehler/).waitFor({ timeout: 60_000 });
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F01-E3 reopening the app restores tabs and does not ask for trust again', { timeout: 120_000 }, async () => {
  const fx = fixture();
  const first = await launch({ pick: fx.dir });
  const ud = first.userData;
  try {
    await openProject(first.page);
    await openFileInTree(first.page, ['src', 'com', 'example', 'Main.java']);
    await openFileInTree(first.page, ['src', 'com', 'example', 'Greeter.java']);
    await first.app.close();
    const second = await launch({ pick: fx.dir, userData: ud });
    try {
      await second.page.getByRole('option', { name: /hello-java/ }).dblclick();
      await second.page.getByRole('tab', { name: /Main\.java/ }).waitFor();
      await second.page.getByRole('tab', { name: /Greeter\.java/, selected: true }).waitFor();
      assert.equal(await second.page.getByRole('dialog').count(), 0);
      assertNoErrors(assert, second.errors);
    } finally {
      await second.app.close();
    }
  } finally {
    rmSync(ud, { recursive: true, force: true });
    fx.cleanup();
  }
});

test('F01-E4 switching projects shows the second project\'s file, not the first one\'s', { timeout: 120_000 }, async () => {
  const a = fixture('hello-java', 'projekt-a');
  const b = fixture('hello-java', 'projekt-b');
  writeFileSync(path.join(b.dir, 'src/com/example/Main.java'), 'package com.example;\n\npublic class Main {\n    // Projekt B\n    public static void main(String[] args) {}\n}\n');
  const s = await launch({ pick: a.dir });
  try {
    await openProject(s.page);
    await openFileInTree(s.page, ['src', 'com', 'example', 'Main.java']);
    assert.match(await editorText(s.page), /new Greeter/);
    // back to the welcome screen, open B
    await s.page.getByRole('button', { name: /Projekt schließen/ }).click();
    await s.app.evaluate((_e, dir) => { process.env.HOBEL_PICK_FOLDER = dir; }, b.dir);
    await openProject(s.page);
    await openFileInTree(s.page, ['src', 'com', 'example', 'Main.java']);
    const text = await editorText(s.page);
    assert.match(text, /Projekt B/, 'editor must show B\'s Main.java');
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    a.cleanup();
    b.cleanup();
  }
});

test('F01-N1 a recent project whose folder is gone shows an error, no crash', { timeout: 60_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openProject(s.page);
    await s.page.getByRole('button', { name: /Projekt schließen/ }).click();
    rmSync(fx.dir, { recursive: true, force: true });
    await s.page.getByRole('option', { name: /hello-java/ }).dblclick();
    await s.page.getByRole('alert').getByText(/kann Hobel nicht öffnen/).waitFor();
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F01-N3 a broken language server shows an error in the status bar instead of nothing', { timeout: 90_000 }, async () => {
  const fx = fixture();
  // A JDT LS folder whose launcher is not a real jar: java exits at once, every time.
  const broken = mkdtempSync(path.join(tmpdir(), 'hobel-broken-jdtls-'));
  mkdirSync(path.join(broken, 'plugins'));
  mkdirSync(path.join(broken, 'config_linux'));
  writeFileSync(path.join(broken, 'plugins', 'org.eclipse.equinox.launcher_9.9.9.jar'), 'not a jar');
  const s = await launch({ pick: fx.dir, env: { HOBEL_JDTLS: broken } });
  try {
    await openProject(s.page);
    await s.page.getByRole('status').filter({ hasText: 'Java: läuft nicht' }).waitFor({ timeout: 30_000 });
    // ...and it stays visible after the restarts give up
    await s.page.waitForTimeout(12_000);
    await s.page.getByRole('status').filter({ hasText: 'Java: läuft nicht' }).waitFor({ timeout: 1000 });
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
    rmSync(broken, { recursive: true, force: true });
  }
});
