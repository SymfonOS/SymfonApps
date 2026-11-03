// Bundles tests/unit/*.test.ts for node --test (same loaders as the main bundle).
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'tests/unit');
await build({
  entryPoints: readdirSync(dir).filter((f) => f.endsWith('.test.ts')).map((f) => path.join(dir, f)),
  outdir: path.join(root, 'out/unit'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  loader: { '.sql': 'text' },
  logLevel: 'warning',
});
