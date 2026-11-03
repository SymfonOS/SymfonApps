// Bundles the Electron main and preload processes with esbuild.
import { build } from 'esbuild';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const common = { bundle: true, platform: 'node', target: 'node22', sourcemap: true, external: ['electron'], logLevel: 'info' };
await build({ ...common, entryPoints: [path.join(root, 'src/main/index.ts')], outfile: path.join(root, 'out/main/index.js'), format: 'cjs', loader: { '.sql': 'text' } });
await build({ ...common, entryPoints: [path.join(root, 'src/preload/index.ts')], outfile: path.join(root, 'out/preload/index.js'), format: 'cjs' });
