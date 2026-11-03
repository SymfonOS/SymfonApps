// F04 Find a file and edit it (tree today; Search Everywhere is not built yet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertNoErrors, editorText, fixture, launch, openFileInTree, openProject } from './helpers.mjs';

const MAIN = 'src/com/example/Main.java';

async function openMain(s) {
  await openProject(s.page);
  await openFileInTree(s.page, ['src', 'com', 'example', 'Main.java']);
  await s.page.locator('.monaco-editor .view-lines').click();
}

test('F04-H1 edit and save with Ctrl+S writes the file and clears the dirty marker', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    await s.page.keyboard.press('Control+End');
    await s.page.keyboard.type('// Grüße 🚀 äöü');
    await s.page.getByRole('button', { name: 'Main.java schließen (ungespeichert)' }).waitFor();
    await s.page.keyboard.press('Control+S');
    await s.page.getByRole('button', { name: 'Main.java schließen', exact: true }).waitFor();
    assert.match(readFileSync(path.join(fx.dir, MAIN), 'utf8'), /\/\/ Grüße 🚀 äöü$/);
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F04-E1 closing a tab with unsaved changes asks first; cancel keeps the tab', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    await s.page.keyboard.type('x');
    s.page.once('dialog', (d) => d.dismiss());
    await s.page.getByRole('button', { name: 'Main.java schließen (ungespeichert)' }).click();
    await s.page.getByRole('tab', { name: /Main\.java/ }).waitFor();
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F04-E2 an external change to a clean file reloads it in the editor', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    writeFileSync(path.join(fx.dir, MAIN), readFileSync(path.join(fx.dir, MAIN), 'utf8').replace('Hallo', 'Servus'));
    await s.page.locator('.monaco-editor .view-lines').getByText('"Servus"').waitFor({ timeout: 10_000 });
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F04-E3 saving over an external change asks; cancel keeps the disk version', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    await s.page.keyboard.press('Control+End');
    await s.page.keyboard.type('// mine');
    const file = path.join(fx.dir, MAIN);
    writeFileSync(file, '// theirs\n');
    const later = new Date(Date.now() + 5000);
    utimesSync(file, later, later);
    const dialog = new Promise((resolve) => s.page.once('dialog', async (d) => { resolve(d.message()); await d.dismiss(); }));
    await s.page.keyboard.press('Control+S');
    assert.match(await dialog, /außerhalb von Mini-IDEA geändert/);
    assert.equal(readFileSync(file, 'utf8'), '// theirs\n');
    await s.page.getByRole('button', { name: 'Main.java schließen (ungespeichert)' }).waitFor();
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F04-E4 Ctrl+R does not reload the window and throw away unsaved edits', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    await s.page.keyboard.press('Control+End');
    await s.page.keyboard.type('// ungespeichert');
    await s.page.keyboard.press('Control+R');
    await s.page.waitForTimeout(1500);
    assert.match(await editorText(s.page), /\/\/ ungespeichert/);
    await s.page.getByRole('button', { name: 'Main.java schließen (ungespeichert)' }).waitFor({ timeout: 2000 });
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F04-E5 closing the window with unsaved changes asks; cancel keeps working, save-all saves and quits', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    await s.page.keyboard.press('Control+End');
    await s.page.keyboard.type('// vor dem Schließen');
    const requestClose = () => s.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
    await requestClose();
    const dialog = s.page.getByRole('dialog', { name: /Ungespeicherte Änderungen/ });
    await dialog.waitFor({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.match(await editorText(s.page), /vor dem Schließen/);
    const closed = s.app.waitForEvent('close');
    await requestClose();
    await dialog.getByRole('button', { name: /Alle speichern/ }).click();
    await closed;
    assert.match(readFileSync(path.join(fx.dir, MAIN), 'utf8'), /\/\/ vor dem Schließen$/);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F04-E6 keyboard only: Alt+1 focuses the tree, Escape returns to the editor', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openMain(s);
    await s.page.keyboard.press('Alt+1'); // hide
    await s.page.getByRole('tree').waitFor({ state: 'detached' });
    await s.page.keyboard.press('Alt+1'); // show + focus
    await s.page.getByRole('tree').waitFor();
    await s.page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'tree');
    await s.page.keyboard.press('Escape');
    await s.page.waitForFunction(() => !!document.activeElement?.closest('.monaco-editor'));
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});
