// Projects, files and editor state (F01, F04). Every path from the renderer is
// resolved against the project root and rejected if it escapes it.
import { promises as fsp, watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import type { DirEntry, EditorTabState, FileContent, Project } from '../shared/ipc';
import { newId, now, type Db } from './db';

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'out', 'build', 'target', '.gradle', '.idea', '.mini-idea']);
const MAX_FILE_BYTES = 20 * 1024 * 1024;

interface ProjectRow {
  id: string;
  name: string;
  root_path: string;
  trusted: number;
  last_opened_at: number | null;
}

const isInside = (root: string, p: string) => p === root || p.startsWith(root.endsWith(path.sep) ? root : root + path.sep);

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  rootPath: r.root_path,
  trusted: r.trusted === 1,
  lastOpenedAt: r.last_opened_at,
});

export class ProjectService {
  private watchers = new Map<string, FSWatcher>();

  constructor(
    private db: Db,
    private emitChanged: (projectId: string, paths: string[]) => void,
  ) {}

  list(): Project[] {
    const rows = this.db
      .prepare('select * from projects order by last_opened_at desc nulls last')
      .all() as unknown as ProjectRow[];
    return rows.map(toProject);
  }

  get(projectId: string): Project {
    const row = this.db.prepare('select * from projects where id = ?').get(projectId) as ProjectRow | undefined;
    if (!row) throw new Error('unknown project');
    return toProject(row);
  }

  async open(dir: string): Promise<{ project: Project; needsTrust: boolean }> {
    const root = path.resolve(dir);
    const stat = await fsp.stat(root);
    if (!stat.isDirectory()) throw new Error('not a folder');
    const t = now();
    const existing = this.db.prepare('select * from projects where root_path = ?').get(root) as ProjectRow | undefined;
    if (existing) {
      this.db.prepare('update projects set last_opened_at = ?, updated_at = ? where id = ?').run(t, t, existing.id);
    } else {
      this.db
        .prepare('insert into projects (id, name, root_path, last_opened_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)')
        .run(newId(), path.basename(root), root, t, t, t);
    }
    const row = this.db.prepare('select * from projects where root_path = ?').get(root) as unknown as ProjectRow;
    const project = toProject(row);
    this.startWatcher(project);
    return { project, needsTrust: !project.trusted };
  }

  trust(projectId: string): Project {
    this.db.prepare('update projects set trusted = 1, updated_at = ? where id = ?').run(now(), projectId);
    return this.get(projectId);
  }

  remove(projectId: string): void {
    this.watchers.get(projectId)?.close();
    this.watchers.delete(projectId);
    this.db.prepare('delete from projects where id = ?').run(projectId);
  }

  /** Absolute path inside the project root, or throws. Checks the path as written. */
  resolve(projectId: string, rel: string): string {
    const root = this.get(projectId).rootPath;
    const abs = path.resolve(root, rel);
    if (!isInside(root, abs)) throw new Error('path outside project');
    return abs;
  }

  /**
   * Like resolve(), and also follows symlinks: a link inside the project that points
   * outside it is refused, so the renderer can never read or write beyond the root.
   * For a file that does not exist yet, its parent folder is checked.
   */
  async resolveReal(projectId: string, rel: string): Promise<string> {
    const abs = this.resolve(projectId, rel);
    const realRoot = await fsp.realpath(this.get(projectId).rootPath);
    const target = await fsp.realpath(abs).catch(async () => path.join(await fsp.realpath(path.dirname(abs)), path.basename(abs)));
    if (!isInside(realRoot, target)) throw new Error('path outside project (symlink)');
    return abs;
  }

  async readDir(projectId: string, rel: string): Promise<DirEntry[]> {
    const abs = await this.resolveReal(projectId, rel);
    const entries = await fsp.readdir(abs, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() || e.isFile())
      .map((e) => ({
        name: e.name,
        path: path.posix.join(rel.split(path.sep).join('/'), e.name).replace(/^\.\//, ''),
        kind: e.isDirectory() ? ('dir' as const) : ('file' as const),
        ignored: e.isDirectory() && IGNORED_DIRS.has(e.name),
      }))
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  }

  async readFile(projectId: string, rel: string): Promise<FileContent> {
    const abs = await this.resolveReal(projectId, rel);
    const stat = await fsp.stat(abs);
    if (stat.size > MAX_FILE_BYTES) throw new Error('file too large to open');
    const content = await fsp.readFile(abs, 'utf8');
    return { content, mtime: stat.mtimeMs, lineEnding: content.includes('\r\n') ? 'CRLF' : 'LF' };
  }

  /** Atomic save. If the file changed on disk since it was read, report a conflict instead of overwriting. */
  async writeFile(projectId: string, rel: string, content: string, expectedMtime: number | null) {
    const abs = await this.resolveReal(projectId, rel);
    if (expectedMtime !== null) {
      const disk = await fsp.stat(abs).catch(() => null);
      if (disk && Math.abs(disk.mtimeMs - expectedMtime) > 1) return { conflict: true as const, diskMtime: disk.mtimeMs };
    }
    const tmp = `${abs}.mini-idea-${process.pid}.tmp`;
    await fsp.writeFile(tmp, content, 'utf8');
    await fsp.rename(tmp, abs);
    return { mtime: (await fsp.stat(abs)).mtimeMs };
  }

  loadEditorState(projectId: string): EditorTabState[] {
    const rows = this.db
      .prepare('select file_path, active, view_state from editor_states where project_id = ? and split_group = 0 order by tab_index')
      .all(projectId) as { file_path: string; active: number; view_state: string }[];
    return rows.map((r) => ({ filePath: r.file_path, active: r.active === 1, viewState: JSON.parse(r.view_state) }));
  }

  saveEditorState(projectId: string, tabs: EditorTabState[]): void {
    const t = now();
    this.db.exec('begin');
    try {
      this.db.prepare('delete from editor_states where project_id = ?').run(projectId);
      const ins = this.db.prepare(
        'insert into editor_states (project_id, file_path, split_group, tab_index, active, view_state, updated_at) values (?, ?, 0, ?, ?, ?, ?)',
      );
      tabs.forEach((tab, i) => ins.run(projectId, tab.filePath, i, tab.active ? 1 : 0, JSON.stringify(tab.viewState ?? {}), t));
      this.db.exec('commit');
    } catch (e) {
      this.db.exec('rollback');
      throw e;
    }
  }

  private startWatcher(project: Project): void {
    if (this.watchers.has(project.id)) return;
    let pending = new Set<string>();
    let timer: NodeJS.Timeout | null = null;
    try {
      const w = watch(project.rootPath, { recursive: true }, (_ev, file) => {
        if (!file) return;
        const rel = file.toString().split(path.sep).join('/');
        if (rel.split('/').some((seg) => IGNORED_DIRS.has(seg)) || rel.endsWith('.tmp')) return;
        pending.add(rel);
        timer ??= setTimeout(() => {
          const paths = [...pending];
          pending = new Set();
          timer = null;
          this.emitChanged(project.id, paths);
        }, 150);
      });
      this.watchers.set(project.id, w);
    } catch {
      // Watcher limits (inotify) must not block opening the project.
    }
  }

  dispose(): void {
    for (const w of this.watchers.values()) w.close();
    this.watchers.clear();
  }
}
