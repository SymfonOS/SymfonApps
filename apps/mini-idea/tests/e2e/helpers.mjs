// Shared e2e helpers: launch the real Electron app against throwaway copies of fixtures,
// fail on page errors, and run an axe accessibility scan on the current screen.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron } from 'playwright-core';

export const appDir = path.resolve(import.meta.dirname, '..', '..');
export const shots = path.resolve(appDir, '..', '..', 'replica', 'clone-screens');
mkdirSync(shots, { recursive: true });

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** Monaco logs these when workers fall back; they are not app errors. */
const IGNORED = /Could not create web worker|Falling back to loading web worker code/;

export function fixture(name = 'hello-java', dirName) {
  const base = mkdtempSync(path.join(tmpdir(), 'mini-idea-fx-'));
  const dir = path.join(base, dirName ?? name);
  cpSync(path.join(appDir, 'tests', 'fixtures', name), dir, { recursive: true });
  return { dir, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

/**
 * @param {{ pick?: string, userData?: string, env?: Record<string, string> }} opts
 */
export async function launch({ pick, userData, env } = {}) {
  const ud = userData ?? mkdtempSync(path.join(tmpdir(), 'mini-idea-ud-'));
  const app = await _electron.launch({
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron'),
    args: [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), appDir],
    env: { ...process.env, MINI_IDEA_USER_DATA: ud, ...(pick ? { MINI_IDEA_PICK_FOLDER: pick } : {}), ...env },
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !IGNORED.test(m.text()) && errors.push(m.text()));
  await page.waitForLoadState('domcontentloaded');
  return {
    app,
    page,
    errors,
    userData: ud,
    async close() {
      await app.close().catch(() => undefined);
      if (!userData) rmSync(ud, { recursive: true, force: true });
    },
  };
}

/** Open the picked folder, answer the trust dialog. */
export async function openProject(page, { trust = true } = {}) {
  await page.getByRole('button', { name: 'Ordner öffnen' }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: trust ? 'Vertrauen und öffnen' : 'Sicherer Modus' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

/** Expand tree folders by name and open a file, by clicking (keyboard is covered in F04). */
export async function openFileInTree(page, segments) {
  for (const seg of segments.slice(0, -1)) {
    const item = page.getByRole('treeitem', { name: seg, exact: true });
    if ((await item.getAttribute('aria-expanded')) !== 'true') await item.click();
  }
  await page.getByRole('treeitem', { name: segments.at(-1), exact: true }).dblclick();
  await page.getByRole('tab', { name: new RegExp(segments.at(-1).replace('.', '\\.')) }).waitFor();
}

export async function waitForJava(page, timeout = 180_000) {
  await page.getByRole('status').filter({ hasText: /Java bereit|Ready/ }).waitFor({ timeout });
}

/**
 * Visible text of the code editor. Monaco renders code without accessible roles, so this
 * is the one place that reads a CSS class. Fine for the small fixture files (no scrolling).
 */
export async function editorText(page) {
  const text = await page.locator('.monaco-editor .view-lines').innerText();
  return text.replace(/ /g, ' ');
}

/**
 * axe scan of the current screen. Monaco's internals are excluded (third-party, has its own
 * a11y mode); everything we render is in scope. Returns violations as short strings.
 */
export async function axe(page) {
  await page.evaluate(axeSource);
  const res = await page.evaluate(async () =>
    // eslint-disable-next-line no-undef
    axe.run({ exclude: [['.monaco-editor'], ['.monaco-aria-container']] }, { resultTypes: ['violations'] }),
  );
  return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
}

export function assertNoErrors(assert, errors) {
  assert.deepEqual(errors, [], 'page errors / console errors');
}
