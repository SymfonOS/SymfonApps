// Network: Hobel itself contacts no server. All traffic goes through a local proxy that only
// records the target and refuses. The one known request comes from the bundled Eclipse JDT
// Language Server (Buildship fetches the public list of Gradle versions once at startup).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fixture, launch, openProject } from './helpers.mjs';

const KNOWN = new Set(['services.gradle.org:443']);

test('NET-1 opening and trusting a project makes no network calls except the known one', { timeout: 120_000 }, async () => {
  const seen = [];
  const proxy = http.createServer((req, res) => {
    seen.push(`HTTP ${req.url}`);
    res.writeHead(403).end();
  });
  proxy.on('connect', (req, sock) => {
    seen.push(req.url);
    sock.end('HTTP/1.1 403 Forbidden\r\n\r\n');
  });
  await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${proxy.address().port}`;
  const fx = fixture();
  const s = await launch({
    pick: fx.dir,
    args: [`--proxy-server=${url}`],
    env: { HTTPS_PROXY: url, HTTP_PROXY: url, https_proxy: url, http_proxy: url, NO_PROXY: '', no_proxy: '' },
  });
  try {
    await openProject(s.page);
    await s.page.getByRole('status').filter({ hasText: /Java: bereit/ }).waitFor({ timeout: 90_000 });
    await s.page.waitForTimeout(15_000);
    assert.deepEqual(seen.filter((t) => !KNOWN.has(t)), [], `unexpected network targets: ${seen.join(', ')}`);
  } finally {
    await s.close();
    fx.cleanup();
    proxy.close();
  }
});
