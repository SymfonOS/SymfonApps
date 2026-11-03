// Run configurations and run sessions (F08). The vertical slice supports plain
// Java "application" configs: compile the source root with javac, then run java.
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type { RunConfiguration, RunSession, RunStatus } from '../shared/ipc';
import { newId, now, type Db } from './db';
import { JAVA_UTF8_FLAGS, javaEnv } from './java-env';

interface ConfigRow {
  id: string;
  project_id: string;
  name: string;
  type: string;
  options: string;
  args: string;
  vm_options: string;
  temporary: number;
}

const toConfig = (r: ConfigRow): RunConfiguration => ({
  id: r.id,
  projectId: r.project_id,
  name: r.name,
  type: 'application',
  options: JSON.parse(r.options),
  args: r.args,
  vmOptions: r.vm_options,
  temporary: r.temporary === 1,
});

export interface RunEvents {
  output(sessionId: string, stream: 'stdout' | 'stderr' | 'system', text: string): void;
  status(session: RunSession): void;
}

const MAIN_RE = /\bpublic\s+static\s+void\s+main\s*\(/;
const MAX_OUTPUT_CHUNK = 64 * 1024;

export class RunService {
  private procs = new Map<string, { proc: ChildProcess | null; session: RunSession; killed: boolean }>();

  constructor(
    private db: Db,
    private projectRoot: (projectId: string) => string,
    private events: RunEvents,
    /** Resolves a project-relative path with the same containment check as file reads. */
    private resolveFile: (projectId: string, rel: string) => Promise<string>,
  ) {}

  list(projectId: string): RunConfiguration[] {
    const rows = this.db
      .prepare('select * from run_configurations where project_id = ? order by sort_order, name')
      .all(projectId) as unknown as ConfigRow[];
    return rows.map(toConfig);
  }

  /** Temporary config for the class in a file, like clicking the run icon in the gutter. */
  async fromContext(projectId: string, filePath: string): Promise<RunConfiguration | null> {
    if (!filePath.endsWith('.java')) return null;
    const source = await fsp.readFile(await this.resolveFile(projectId, filePath), 'utf8');
    if (!MAIN_RE.test(source)) return null;
    const pkg = /^\s*package\s+([\w.]+)\s*;/m.exec(source)?.[1];
    const cls = path.basename(filePath, '.java');
    const mainClass = pkg ? `${pkg}.${cls}` : cls;
    // Source root = file's folder minus the package path.
    const dir = path.posix.dirname(filePath);
    const pkgPath = pkg ? pkg.replace(/\./g, '/') : '';
    const sourceRoot = pkgPath && dir.endsWith(pkgPath) ? dir.slice(0, dir.length - pkgPath.length).replace(/\/$/, '') || '.' : dir;

    const existing = this.db
      .prepare('select * from run_configurations where project_id = ? and name = ?')
      .get(projectId, cls) as ConfigRow | undefined;
    const options = JSON.stringify({ mainClass, sourceRoot });
    const t = now();
    if (existing) {
      this.db.prepare('update run_configurations set options = ?, updated_at = ? where id = ?').run(options, t, existing.id);
      return toConfig({ ...existing, options });
    }
    const id = newId();
    this.db
      .prepare(
        "insert into run_configurations (id, project_id, name, type, options, temporary, created_at, updated_at) values (?, ?, ?, 'application', ?, 1, ?, ?)",
      )
      .run(id, projectId, cls, options, t, t);
    return this.getConfig(id);
  }

  private getConfig(id: string): RunConfiguration {
    const row = this.db.prepare('select * from run_configurations where id = ?').get(id) as ConfigRow | undefined;
    if (!row) throw new Error('unknown run configuration');
    return toConfig(row);
  }

  async start(configId: string): Promise<RunSession> {
    const config = this.getConfig(configId);
    // Single instance: a second start of a running config restarts it instead of running twice.
    for (const [sid, p] of this.procs) {
      if (p.session.configId === configId && (p.session.status === 'running' || p.session.status === 'starting')) this.stop(sid);
    }
    const root = this.projectRoot(config.projectId);
    const session: RunSession = { id: newId(), configId, configName: config.name, status: 'starting', exitCode: null, startedAt: now() };
    this.db
      .prepare("insert into run_sessions (id, project_id, config_id, config_name, mode, status, started_at) values (?, ?, ?, ?, 'run', 'starting', ?)")
      .run(session.id, config.projectId, configId, config.name, session.startedAt);
    const entry = { proc: null as ChildProcess | null, session, killed: false };
    this.procs.set(session.id, entry);
    this.events.status({ ...session });

    void this.compileAndRun(entry, config, root);
    return session;
  }

  private async compileAndRun(
    entry: { proc: ChildProcess | null; session: RunSession; killed: boolean },
    config: RunConfiguration,
    root: string,
  ): Promise<void> {
    const sid = entry.session.id;
    const srcRoot = path.resolve(root, config.options.sourceRoot);
    const outDir = path.join(root, '.mini-idea', 'classes');
    const sources = await collectJava(srcRoot);
    await fsp.mkdir(outDir, { recursive: true });

    this.events.output(sid, 'system', `javac (${sources.length} Dateien)\n`);
    const javacCode = await this.spawnStreaming(entry, 'javac', ['-encoding', 'UTF-8', '-d', outDir, '-g', ...sources], root);
    if (entry.killed) return this.finish(entry, 'killed', null);
    if (javacCode !== 0) {
      this.events.output(sid, 'system', `\nKompilieren fehlgeschlagen (Code ${javacCode}).\n`);
      return this.finish(entry, 'failed', javacCode);
    }
    const args = [...JAVA_UTF8_FLAGS, ...splitArgs(config.vmOptions), '-cp', outDir, config.options.mainClass, ...splitArgs(config.args)];
    this.events.output(sid, 'system', `java ${config.options.mainClass}\n`);
    this.setStatus(entry, 'running');
    const code = await this.spawnStreaming(entry, 'java', args, root);
    if (entry.killed) return this.finish(entry, 'killed', code);
    this.events.output(sid, 'system', `\nProzess beendet mit Code ${code}\n`);
    this.finish(entry, code === 0 ? 'exited' : 'failed', code);
  }

  private spawnStreaming(entry: { proc: ChildProcess | null; session: RunSession }, cmd: string, args: string[], cwd: string): Promise<number> {
    return new Promise((resolve) => {
      // JAVA_TOOL_OPTIONS makes the JVM print a banner to stderr; keep the user's env otherwise.
      const env = javaEnv();
      delete env.JAVA_TOOL_OPTIONS;
      const proc = spawn(cmd, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
      entry.proc = proc;
      const send = (stream: 'stdout' | 'stderr') => (buf: Buffer) => {
        const text = buf.toString('utf8');
        for (let i = 0; i < text.length; i += MAX_OUTPUT_CHUNK) this.events.output(entry.session.id, stream, text.slice(i, i + MAX_OUTPUT_CHUNK));
      };
      proc.stdout?.on('data', send('stdout'));
      proc.stderr?.on('data', send('stderr'));
      proc.on('error', (e) => {
        this.events.output(entry.session.id, 'system', `${cmd} konnte nicht gestartet werden: ${e.message}\n`);
        resolve(-1);
      });
      proc.on('close', (code) => resolve(code ?? -1));
    });
  }

  private setStatus(entry: { session: RunSession }, status: RunStatus): void {
    entry.session = { ...entry.session, status };
    this.db.prepare('update run_sessions set status = ? where id = ?').run(status, entry.session.id);
    this.events.status({ ...entry.session });
  }

  private finish(entry: { session: RunSession; proc: ChildProcess | null }, status: RunStatus, code: number | null): void {
    entry.session = { ...entry.session, status, exitCode: code };
    entry.proc = null;
    this.db
      .prepare('update run_sessions set status = ?, exit_code = ?, ended_at = ? where id = ?')
      .run(status, code, now(), entry.session.id);
    this.events.status({ ...entry.session });
  }

  stop(sessionId: string): void {
    const entry = this.procs.get(sessionId);
    if (!entry) return;
    entry.killed = true;
    const proc = entry.proc;
    if (proc && proc.exitCode === null) {
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (proc.exitCode === null) proc.kill('SIGKILL');
      }, 3000).unref();
      this.events.output(sessionId, 'system', '\nProzess gestoppt.\n');
    }
  }

  dispose(): void {
    for (const id of this.procs.keys()) this.stop(id);
  }
}

async function collectJava(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (d: string) => {
    for (const e of await fsp.readdir(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'build' || e.name === 'out' || e.name === 'target') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.java')) out.push(p);
    }
  };
  await walk(dir);
  return out;
}

/** Splits an argument string, honouring double quotes. */
export function splitArgs(s: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1] ?? m[2] ?? '');
  return out;
}
