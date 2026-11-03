// Downloads Eclipse JDT Language Server (EPL-2.0) into .jdtls/.
// Official source: https://download.eclipse.org/jdtls/
import { mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

// Pinned: 1.61.0 is the newest milestone whose core runs on Java 21 (only the optional
// org.eclipse.jdt.core.javac bundle needs 25). 1.62+ and snapshots
// require Java 25 (the server then fails with unresolved osgi.ee JavaSE 25 bundles).
// Override with JDTLS_URL if your JDK is 25 or newer.
const URL = process.env.JDTLS_URL ?? 'https://download.eclipse.org/jdtls/milestones/1.61.0/jdt-language-server-1.61.0-202609031315.tar.gz';
const root = path.resolve(import.meta.dirname, '..', '.jdtls');
const server = path.join(root, 'server');

if (existsSync(path.join(server, 'plugins'))) {
  console.log('jdtls already present in', server);
  process.exit(0);
}
mkdirSync(server, { recursive: true });
const tgz = path.join(root, 'jdtls.tar.gz');
console.log('downloading', URL);
const res = await fetch(URL);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(tgz));
execFileSync('tar', ['-xzf', tgz, '-C', server]);
console.log('jdtls installed in', server);
