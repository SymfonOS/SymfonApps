// LspHost: one language server per project and language, spoken over stdio.
// Main owns initialize/shutdown; the renderer sends requests through `lsp.request`.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from 'vscode-jsonrpc/node';
import type { LspStatus } from '../shared/ipc';

interface Session {
  id: string;
  projectId: string;
  proc: ChildProcess;
  conn: MessageConnection;
  ready: Promise<void>;
  status: LspStatus;
}

export interface LspEvents {
  notification(sessionId: string, method: string, params: unknown): void;
  status(sessionId: string, status: LspStatus, message?: string): void;
}

const MAX_RESTARTS = 3;

/**
 * Source folders for plain folders without a build tool (Gradle/Maven projects bring
 * their own). Without this, JDT LS treats the project root as the source root and
 * flags `package com.example;` in src/com/example as wrong.
 */
export function detectSourcePaths(rootPath: string): string[] {
  const candidates = ['src/main/java', 'src/test/java', 'src'];
  const found = candidates.filter((c) => existsSync(path.join(rootPath, c)));
  // src/main/java wins over the bare src it lives in.
  return found.includes('src/main/java') ? found.filter((c) => c !== 'src') : found;
}

export class LspHost {
  private sessions = new Map<string, Session>();
  private restarts = new Map<string, number[]>();

  constructor(
    private jdtlsHome: string,
    private dataDir: string,
    private events: LspEvents,
  ) {}

  available(): boolean {
    return existsSync(path.join(this.jdtlsHome, 'plugins'));
  }

  /** Reuses a running server for the project. */
  async start(projectId: string, rootPath: string): Promise<string> {
    const id = `${projectId}:java`;
    const existing = this.sessions.get(id);
    if (existing && existing.status !== 'crashed') {
      await existing.ready;
      return id;
    }
    if (!this.available()) {
      this.events.status(id, 'crashed', 'Java language server is not installed. Run: npm run jdtls:download');
      throw new Error('jdtls not installed');
    }
    const session = this.spawnJdtls(id, projectId, rootPath);
    this.sessions.set(id, session);
    await session.ready;
    return id;
  }

  async request(sessionId: string, method: string, params: unknown): Promise<unknown> {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('no such language server session');
    await s.ready;
    return s.conn.sendRequest(method, params);
  }

  async notify(sessionId: string, method: string, params: unknown): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('no such language server session');
    await s.ready;
    await s.conn.sendNotification(method, params);
  }

  private spawnJdtls(id: string, projectId: string, rootPath: string): Session {
    const plugins = path.join(this.jdtlsHome, 'plugins');
    const launcher = readdirSync(plugins).find((f) => /^org\.eclipse\.equinox\.launcher_.*\.jar$/.test(f));
    if (!launcher) throw new Error('jdtls launcher jar not found');
    const config = path.join(this.jdtlsHome, process.platform === 'win32' ? 'config_win' : process.platform === 'darwin' ? 'config_mac' : 'config_linux');
    // Workspace data per project, outside the project folder.
    const ws = path.join(this.dataDir, 'jdtls-workspaces', createHash('sha1').update(rootPath).digest('hex').slice(0, 16));
    mkdirSync(ws, { recursive: true });

    const args = [
      '-Declipse.application=org.eclipse.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-Declipse.product=org.eclipse.jdt.ls.core.product',
      '-Dlog.level=WARNING',
      '-Xmx1G',
      '--add-modules=ALL-SYSTEM',
      '--add-opens', 'java.base/java.util=ALL-UNNAMED',
      '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
      '-jar', path.join(plugins, launcher),
      '-configuration', config,
      '-data', ws,
    ];
    const proc = spawn(process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java', args, {
      cwd: rootPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Server stderr goes to <userData>/logs/jdtls.log for "show log" and debugging.
    mkdirSync(path.join(this.dataDir, 'logs'), { recursive: true });
    const log = createWriteStream(path.join(this.dataDir, 'logs', 'jdtls.log'), { flags: 'a' });
    log.write(`\n--- ${new Date().toISOString()} start ${rootPath}\n`);
    proc.stderr?.pipe(log);
    proc.on('error', (e) => log.write(`spawn error: ${e.message}\n`));
    const conn = createMessageConnection(new StreamMessageReader(proc.stdout!), new StreamMessageWriter(proc.stdin!));

    // Server → client requests we must answer.
    conn.onRequest('workspace/configuration', (p: { items: unknown[] }) => p.items.map(() => null));
    conn.onRequest('client/registerCapability', () => null);
    conn.onRequest('client/unregisterCapability', () => null);
    conn.onRequest('window/workDoneProgress/create', () => null);
    conn.onRequest('workspace/applyEdit', () => ({ applied: false, failureReason: 'not supported yet' }));
    conn.onRequest('window/showMessageRequest', () => null);
    conn.onNotification((method, params) => this.events.notification(id, method, params));
    conn.listen();

    const session: Session = { id, projectId, proc, conn, status: 'starting', ready: Promise.resolve() };
    this.events.status(id, 'starting');

    session.ready = (async () => {
      const rootUri = pathToFileURL(rootPath).toString();
      await conn.sendRequest('initialize', {
        processId: process.pid,
        clientInfo: { name: 'mini-idea', version: '0.1.0' },
        rootUri,
        workspaceFolders: [{ uri: rootUri, name: path.basename(rootPath) }],
        capabilities: {
          workspace: { configuration: true, workspaceFolders: true, applyEdit: false },
          textDocument: {
            synchronization: { didSave: true, dynamicRegistration: false },
            completion: {
              completionItem: { snippetSupport: true, documentationFormat: ['markdown', 'plaintext'], resolveSupport: { properties: ['documentation', 'detail'] } },
            },
            hover: { contentFormat: ['markdown', 'plaintext'] },
            definition: { linkSupport: false },
            publishDiagnostics: { relatedInformation: false },
          },
          window: { workDoneProgress: true },
        },
        initializationOptions: {
          settings: { java: { autobuild: { enabled: true }, project: { sourcePaths: detectSourcePaths(rootPath) } } },
        },
      });
      await conn.sendNotification('initialized', {});
      session.status = 'ready';
      this.events.status(id, 'ready');
    })();
    session.ready.catch((e: Error) => {
      session.status = 'crashed';
      this.events.status(id, 'crashed', e.message);
    });

    proc.on('exit', (code) => {
      if (this.sessions.get(id) !== session) return;
      session.status = 'crashed';
      conn.dispose();
      this.events.status(id, 'crashed', `language server exited (${code ?? 'signal'})`);
      this.maybeRestart(id, projectId, rootPath);
    });
    return session;
  }

  /** Restart with a cap: at most 3 times in 5 minutes (architecture.md → lsp.healthcheck). */
  private maybeRestart(id: string, projectId: string, rootPath: string): void {
    const t = Date.now();
    const recent = (this.restarts.get(id) ?? []).filter((x) => t - x < 5 * 60_000);
    if (recent.length >= MAX_RESTARTS) return;
    recent.push(t);
    this.restarts.set(id, recent);
    setTimeout(() => {
      const s = this.spawnJdtls(id, projectId, rootPath);
      this.sessions.set(id, s);
    }, 1000 * recent.length);
  }

  async dispose(): Promise<void> {
    await Promise.all(
      [...this.sessions.values()].map(async (s) => {
        this.sessions.delete(s.id);
        try {
          await Promise.race([s.conn.sendRequest('shutdown'), new Promise((r) => setTimeout(r, 1500))]);
          await s.conn.sendNotification('exit');
        } catch {
          /* already gone */
        }
        setTimeout(() => s.proc.kill('SIGKILL'), 1000).unref();
      }),
    );
  }
}
