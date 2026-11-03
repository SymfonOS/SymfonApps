// Vertical slice (architecture.md → Build order 1): open a project, trust it, edit Java with
// completion, see a diagnostic, jump to a definition, run it, see the output. Keyboard first.
// Needs a display: run under `xvfb-run -a` on Linux CI. Screenshots go to replica/clone-screens/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron } from 'playwright-core';

const appDir = path.resolve(import.meta.dirname, '..', '..');
const shots = path.resolve(appDir, '..', '..', 'replica', 'clone-screens');
mkdirSync(shots, { recursive: true });

async function launch(projectDir) {
  const userData = mkdtempSync(path.join(tmpdir(), 'mini-idea-ud-'));
  const app = await _electron.launch({
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron'),
    args: [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), appDir],
    env: { ...process.env, MINI_IDEA_USER_DATA: userData, MINI_IDEA_PICK_FOLDER: projectDir },
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.waitForLoadState('domcontentloaded');
  return { app, page, errors, cleanup: () => rmSync(userData, { recursive: true, force: true }) };
}

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'hello-java-'));
  cpSync(path.join(appDir, 'tests', 'fixtures', 'hello-java'), dir, { recursive: true });
  return dir;
}

test('vertical slice: open, trust, complete, diagnose, navigate, run', { timeout: 300_000 }, async () => {
  const project = fixture();
  const { app, page, errors, cleanup } = await launch(project);
  try {
    // S01 empty state
    await page.getByText('Noch keine Projekte').waitFor();
    await page.screenshot({ path: path.join(shots, 'S01-empty.png') });

    // F01: open → trust dialog (focus starts on the trust button)
    await page.getByRole('button', { name: 'Ordner öffnen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.screenshot({ path: path.join(shots, 'S01-trust.png') });
    await page.keyboard.press('Enter');
    await dialog.waitFor({ state: 'hidden' });

    // S06 tree, keyboard only: focus tree, expand src/com/example, open Main.java
    const tree = page.getByRole('tree');
    await tree.focus();
    // Each step waits for the folder to load, like a person would.
    for (const child of ['com', 'example', 'Greeter.java']) {
      await page.keyboard.press('ArrowRight');
      await page.getByRole('treeitem', { name: child, exact: true }).waitFor();
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('ArrowDown'); // Greeter.java → Main.java
    await page.keyboard.press('Enter');
    await page.getByRole('tab', { name: /Main\.java/ }).waitFor();
    await page.locator('.monaco-editor .view-lines').getByText('public static void main').waitFor();

    // Language server ready (JDT LS cold start can take a while)
    await page.getByRole('status').filter({ hasText: /Java bereit|Ready/ }).waitFor({ timeout: 180_000 });
    await page.screenshot({ path: path.join(shots, 'S04-S05-editor.png') });

    // F04/S10: completion on a member access
    await page.locator('.monaco-editor .view-lines').click();
    await page.keyboard.press('Control+Home');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('greeter.gr');
    await page.keyboard.press('Control+Space');
    const suggest = page.locator('.suggest-widget .monaco-list-row').filter({ hasText: 'greet' });
    await suggest.first().waitFor({ timeout: 60_000 });
    await page.screenshot({ path: path.join(shots, 'S10-completion.png') });
    await page.keyboard.press('Escape');

    // F05: the unfinished line is an error → squiggle and the status bar counter
    await page.getByLabel(/[1-9]\d* Fehler/).waitFor({ timeout: 60_000 });
    await page.locator('.monaco-editor .squiggly-error').first().waitFor();
    await page.screenshot({ path: path.join(shots, 'S05-diagnostics.png') });

    // Remove the line again and save; dirty marker goes away
    await page.keyboard.press('Control+Shift+K'); // delete line
    await page.keyboard.press('Control+S');
    await page.getByRole('tab', { name: 'Main.java', exact: true }).waitFor();
    await page.getByLabel(/[1-9]\d* Fehler/).waitFor({ state: 'detached', timeout: 60_000 });

    // F07: go to definition (F12 on "Greeter") opens Greeter.java
    await page.keyboard.press('Control+Home');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F12');
    await page.getByRole('tab', { name: /Greeter\.java/, selected: true }).waitFor({ timeout: 30_000 });
    await page.getByRole('tab', { name: /Main\.java/ }).click();

    // F08/S17: run with Shift+F10, output and exit code appear
    await page.keyboard.press('Shift+F10');
    const log = page.getByRole('log', { name: 'Programmausgabe' });
    await log.getByText('Hallo, Welt!').waitFor({ timeout: 60_000 });
    await log.getByText('Prozess beendet mit Code 0').waitFor({ timeout: 30_000 });
    await page.screenshot({ path: path.join(shots, 'S17-run.png') });

    // Monaco's own worker warnings aside, there must be no page errors.
    assert.deepEqual(errors.filter((e) => !/Could not create web worker|Falling back to loading web worker code/.test(e)), []);
  } catch (e) {
    await page.screenshot({ path: path.join(tmpdir(), 'mini-idea-e2e-failure.png') }).catch(() => undefined);
    throw e;
  } finally {
    await app.close();
    cleanup();
    rmSync(project, { recursive: true, force: true });
  }
});

test('safe mode: files open, run and language server stay off', { timeout: 120_000 }, async () => {
  const project = fixture();
  const { app, page, errors, cleanup } = await launch(project);
  try {
    await page.getByRole('button', { name: 'Ordner öffnen' }).click();
    await page.getByRole('button', { name: 'Sicherer Modus' }).click();
    await page.getByText('Sicherer Modus').first().waitFor();
    assert.equal(await page.getByRole('button', { name: 'Ausführen' }).isDisabled(), true);
    await page.keyboard.press('Shift+F10');
    await page.getByRole('alert').getByText(/sicheren Modus gesperrt/).waitFor();
    await page.screenshot({ path: path.join(shots, 'S04-safe-mode.png') });
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
    cleanup();
    rmSync(project, { recursive: true, force: true });
  }
});
