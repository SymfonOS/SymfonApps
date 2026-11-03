import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { schemas } from './schemas';
import type { EventChannel, EventMap, InvokeChannel, InvokeMap } from '../shared/ipc';
import { openDb } from './db';
import { ProjectService } from './project';
import { LspHost } from './lsp';
import { RunService } from './run';

// Tests and portable runs can point the state somewhere else.
if (process.env.MINI_IDEA_USER_DATA) app.setPath('userData', process.env.MINI_IDEA_USER_DATA);

let win: BrowserWindow | null = null;

function emit<C extends EventChannel>(channel: C, payload: EventMap[C]): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function handle<C extends InvokeChannel>(channel: C, fn: (input: InvokeMap[C]['in']) => Promise<InvokeMap[C]['out']> | InvokeMap[C]['out']): void {
  ipcMain.handle(channel, async (event, raw) => {
    // Only our own window may call in.
    if (!win || event.sender !== win.webContents) throw new Error('unknown sender');
    const input = schemas[channel].parse(raw);
    return fn(input);
  });
}

async function main(): Promise<void> {
  await app.whenReady();
  const userData = app.getPath('userData');
  mkdirSync(userData, { recursive: true });
  const db = openDb(path.join(userData, 'state.db'));

  const projects = new ProjectService(db, (projectId, paths) => emit('fs.changed', { projectId, paths }));
  const jdtlsHome = process.env.MINI_IDEA_JDTLS ?? path.join(app.getAppPath(), '.jdtls', 'server');
  const lsp = new LspHost(jdtlsHome, userData, {
    notification: (sessionId, method, params) => emit('lsp.notification', { sessionId, method, params }),
    status: (sessionId, status, message) => emit('lsp.status', { sessionId, status, message }),
  });
  const runs = new RunService(db, (pid) => projects.get(pid).rootPath, {
    output: (sessionId, stream, text) => emit('run.output', { sessionId, stream, text }),
    status: (session) => emit('run.status', session),
  }, (pid, rel) => projects.resolveReal(pid, rel));

  const requireTrusted = (projectId: string) => {
    if (!projects.get(projectId).trusted) throw new Error('Projekt ist nicht vertrauenswürdig: Build und Ausführung sind gesperrt.');
  };

  handle('project.list', () => projects.list());
  handle('project.pickFolder', async () => {
    if (process.env.MINI_IDEA_PICK_FOLDER) return process.env.MINI_IDEA_PICK_FOLDER;
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] });
    return r.canceled ? null : (r.filePaths[0] ?? null);
  });
  handle('project.open', ({ path: p }) => projects.open(p));
  handle('project.trust', ({ projectId }) => projects.trust(projectId));
  handle('project.remove', ({ projectId }) => projects.remove(projectId));
  handle('fs.readDir', ({ projectId, path: p }) => projects.readDir(projectId, p));
  handle('fs.readFile', ({ projectId, path: p }) => projects.readFile(projectId, p));
  handle('fs.writeFile', ({ projectId, path: p, content, expectedMtime }) => projects.writeFile(projectId, p, content, expectedMtime));
  handle('editorState.load', ({ projectId }) => projects.loadEditorState(projectId));
  handle('editorState.save', ({ projectId, tabs }) => projects.saveEditorState(projectId, tabs));
  handle('lsp.start', async ({ projectId }) => {
    requireTrusted(projectId);
    return { sessionId: await lsp.start(projectId, projects.get(projectId).rootPath) };
  });
  handle('lsp.request', ({ sessionId, method, params }) => lsp.request(sessionId, method, params));
  handle('lsp.notify', ({ sessionId, method, params }) => lsp.notify(sessionId, method, params));
  handle('runConfig.list', ({ projectId }) => runs.list(projectId));
  handle('runConfig.fromContext', ({ projectId, filePath }) => runs.fromContext(projectId, filePath));
  handle('run.start', ({ configId }) => {
    const cfg = db.prepare('select project_id from run_configurations where id = ?').get(configId) as { project_id: string } | undefined;
    if (!cfg) throw new Error('unknown run configuration');
    requireTrusted(cfg.project_id);
    return runs.start(configId);
  });
  handle('run.stop', ({ sessionId }) => runs.stop(sessionId));

  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#1b1d21',
    title: 'Mini-IDEA',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win?.show());
  // Links open in the system browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  await win.loadFile(path.join(__dirname, '../renderer/index.html'));

  app.on('before-quit', () => {
    runs.dispose();
    projects.dispose();
    void lsp.dispose();
  });
}

app.on('window-all-closed', () => app.quit());
main().catch((e) => {
  console.error(e);
  app.exit(1);
});
