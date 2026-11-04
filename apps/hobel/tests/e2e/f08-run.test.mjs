// F08 Run a program: edge and negative cases (happy path is in vertical-slice).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertNoErrors, axe, fixture, launch, openFileInTree, openProject } from './helpers.mjs';

const MAIN = 'src/com/example/Main.java';
const main = (body) => `package com.example;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n${body}\n    }\n}\n`;

async function runMain(s) {
  await openProject(s.page);
  await openFileInTree(s.page, ['src', 'com', 'example', 'Main.java']);
  await s.page.getByRole('button', { name: 'Ausführen', exact: true }).click();
  return s.page.getByRole('log', { name: 'Programmausgabe' });
}

test('F08-E1 an endless program can be stopped', { timeout: 90_000 }, async () => {
  const fx = fixture();
  writeFileSync(path.join(fx.dir, MAIN), main('        while (true) { Thread.sleep(50); }'));
  const s = await launch({ pick: fx.dir });
  try {
    const log = await runMain(s);
    await s.page.getByText('Main: läuft').waitFor({ timeout: 30_000 });
    assert.deepEqual(await axe(s.page), [], 'workspace with run panel');
    await s.page.getByRole('button', { name: 'Stoppen' }).first().click();
    await log.getByText('Gestoppt.').waitFor();
    await s.page.getByText('Main: gestoppt').waitFor({ timeout: 10_000 });
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F08-E2 a compile error is reported with a link to the line', { timeout: 90_000 }, async () => {
  const fx = fixture();
  writeFileSync(path.join(fx.dir, MAIN), main('        int x = "text";'));
  const s = await launch({ pick: fx.dir });
  try {
    const log = await runMain(s);
    await log.getByText(/Nicht kompiliert/).waitFor({ timeout: 30_000 });
    await log.getByText(/incompatible types|inkompatible Typen/).waitFor();
    await s.page.getByText(/Main: beendet \(Code [1-9]/).waitFor();
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F08-E3 an exception\'s stack trace links back to the source line', { timeout: 90_000 }, async () => {
  const fx = fixture();
  writeFileSync(path.join(fx.dir, MAIN), main('        new Greeter(null).greet(null);\n        throw new IllegalStateException("kaputt");'));
  const s = await launch({ pick: fx.dir });
  try {
    const log = await runMain(s);
    await log.getByText(/IllegalStateException: kaputt/).waitFor({ timeout: 30_000 });
    await log.getByRole('button', { name: 'Main.java:6' }).click();
    await s.page.getByRole('status').filter({ hasText: /^6:/ }).or(s.page.getByText(/^6:1$/)).first().waitFor({ timeout: 5000 });
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F08-E4 pressing Run twice quickly gives one finished run, not two interleaved', { timeout: 90_000 }, async () => {
  const fx = fixture();
  const s = await launch({ pick: fx.dir });
  try {
    await openProject(s.page);
    await openFileInTree(s.page, ['src', 'com', 'example', 'Main.java']);
    const run = s.page.getByRole('button', { name: 'Ausführen', exact: true });
    await run.click();
    await run.click();
    const log = s.page.getByRole('log', { name: 'Programmausgabe' });
    await log.getByText('Beendet mit Code 0').waitFor({ timeout: 30_000 });
    await s.page.waitForTimeout(1500);
    const text = await log.innerText();
    assert.equal(text.match(/Hallo, Welt!/g)?.length, 1, text);
    assert.doesNotMatch(text, /Gestoppt\./, 'output of the replaced run must not leak in');
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});

test('F08-E5 non-ASCII output arrives intact', { timeout: 90_000 }, async () => {
  const fx = fixture();
  writeFileSync(path.join(fx.dir, MAIN), main('        System.out.println("Grüße aus Köln 🚀 – €");'));
  const s = await launch({ pick: fx.dir });
  try {
    const log = await runMain(s);
    await log.getByText('Beendet mit Code 0').waitFor({ timeout: 30_000 });
    assert.match(await log.innerText(), /Grüße aus Köln 🚀 – €/);
    assertNoErrors(assert, s.errors);
  } finally {
    await s.close();
    fx.cleanup();
  }
});
