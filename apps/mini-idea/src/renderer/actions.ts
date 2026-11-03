// Cross-component actions: open/trust a project, start the language server, open files, run.
import type { Project } from '@shared/ipc';
import { monaco } from './monaco';
import { JavaLspClient } from './lsp-client';
import { ide, useIde } from './store';
import { adoptSession, clearRun } from './run-events';

// ---------- models (one Monaco model per open file) ----------

interface ModelEntry {
  model: monaco.editor.ITextModel;
  mtime: number;
  savedVersion: number;
}
// Keyed by project id + path, so two projects with the same relative path never share a model.
const models = new Map<string, ModelEntry>();
const key = (path: string) => `${useIde.getState().project?.id ?? ''}\u0000${path}`;
let lsp: JavaLspClient | null = null;
let revealRequest: { path: string; range: monaco.IRange } | null = null;

const languageFor = (path: string) =>
  path.endsWith('.java') ? 'java' : path.endsWith('.kts') || path.endsWith('.kt') ? 'kotlin' : path.endsWith('.xml') ? 'xml'
    : path.endsWith('.md') ? 'markdown' : path.endsWith('.json') ? 'json' : path.endsWith('.properties') ? 'ini'
      : path.endsWith('.gradle') ? 'groovy' : 'plaintext';

export function uriFor(project: Project, path: string): monaco.Uri {
  return monaco.Uri.file(`${project.rootPath}/${path}`);
}

export function pathForUri(project: Project, uri: monaco.Uri): string | null {
  const root = monaco.Uri.file(project.rootPath).path + '/';
  return uri.path.startsWith(root) ? uri.path.slice(root.length) : null;
}

export async function getModel(path: string): Promise<ModelEntry> {
  const existing = models.get(key(path));
  if (existing) return existing;
  const project = useIde.getState().project!;
  const file = await ide.invoke('fs.readFile', { projectId: project.id, path });
  const model = monaco.editor.createModel(file.content, languageFor(path), uriFor(project, path));
  if (file.lineEnding === 'CRLF') model.setEOL(monaco.editor.EndOfLineSequence.CRLF);
  const entry = { model, mtime: file.mtime, savedVersion: model.getAlternativeVersionId() };
  models.set(key(path), entry);
  model.onDidChangeContent(() => useIde.getState().setDirty(path, model.getAlternativeVersionId() !== entry.savedVersion));
  if (model.getLanguageId() === 'java') lsp?.didOpen(model);
  return entry;
}

export async function saveFile(path: string): Promise<boolean> {
  const entry = models.get(key(path));
  const project = useIde.getState().project;
  if (!entry || !project) return false;
  const res = await ide.invoke('fs.writeFile', { projectId: project.id, path, content: entry.model.getValue(), expectedMtime: entry.mtime });
  if ('conflict' in res) {
    const overwrite = confirm(`„${path}“ wurde außerhalb von Mini-IDEA geändert.\n\nOK: deine Fassung speichern und die Änderung auf der Platte überschreiben.\nAbbrechen: nichts speichern.`);
    if (!overwrite) return false;
    const forced = await ide.invoke('fs.writeFile', { projectId: project.id, path, content: entry.model.getValue(), expectedMtime: null });
    if ('mtime' in forced) entry.mtime = forced.mtime;
  } else {
    entry.mtime = res.mtime;
  }
  entry.savedVersion = entry.model.getAlternativeVersionId();
  useIde.getState().setDirty(path, false);
  if (entry.model.getLanguageId() === 'java') lsp?.didSave(entry.model);
  return true;
}

/** Saves every dirty tab. Returns false if any file was not saved (e.g. a declined conflict). */
export async function saveAll(): Promise<boolean> {
  let ok = true;
  for (const tab of useIde.getState().tabs) if (tab.dirty && !(await saveFile(tab.path))) ok = false;
  return ok;
}

export function closeFile(path: string): void {
  const tab = useIde.getState().tabs.find((t) => t.path === path);
  if (tab?.dirty && !confirm(`„${path}“ hat ungespeicherte Änderungen. Trotzdem schließen?`)) return;
  useIde.getState().closeTab(path);
  const entry = models.get(key(path));
  if (entry) {
    lsp?.didClose(entry.model);
    entry.model.dispose();
    models.delete(key(path));
  }
}

/** Reload clean models when the file changed on disk; leave dirty ones alone (save will ask). */
export async function onExternalChange(paths: string[]): Promise<void> {
  const project = useIde.getState().project;
  if (!project) return;
  for (const p of paths) {
    const entry = models.get(key(p));
    if (!entry || entry.model.getAlternativeVersionId() !== entry.savedVersion) continue;
    const file = await ide.invoke('fs.readFile', { projectId: project.id, path: p }).catch(() => null);
    if (!file || file.mtime === entry.mtime) continue;
    if (file.content !== entry.model.getValue()) entry.model.setValue(file.content);
    entry.mtime = file.mtime;
    entry.savedVersion = entry.model.getAlternativeVersionId();
    useIde.getState().setDirty(p, false);
  }
}

export function openFile(path: string, range?: monaco.IRange): void {
  if (range) {
    revealRequest = { path, range };
    useIde.getState().set({ revealNonce: useIde.getState().revealNonce + 1 });
  }
  useIde.getState().openTab(path);
}

export function takeRevealRequest(path: string): monaco.IRange | null {
  if (revealRequest?.path !== path) return null;
  const r = revealRequest.range;
  revealRequest = null;
  return r;
}

// ---------- editor focus ----------

let editorFocus: (() => void) | null = null;
/** The editor registers how to focus itself; Monaco's input element is an implementation detail. */
export function registerEditorFocus(fn: (() => void) | null): void {
  editorFocus = fn;
}
export function focusEditor(): void {
  editorFocus?.();
}

// ---------- projects ----------

/**
 * Leaves the current project: asks about unsaved files, then drops every model, marker and
 * the language server client, so nothing of this project can show up in the next one.
 * Returns false if the user cancelled.
 */
export function closeProject(): boolean {
  const st = useIde.getState();
  const dirty = st.tabs.filter((t) => t.dirty);
  if (dirty.length && !confirm(`${dirty.length === 1 ? `„${dirty[0]!.path}“ hat` : `${dirty.length} Dateien haben`} ungespeicherte Änderungen. Projekt trotzdem schließen?`)) {
    return false;
  }
  persistEditorState();
  for (const { model } of models.values()) {
    lsp?.didClose(model);
    model.dispose();
  }
  models.clear();
  monaco.editor.removeAllMarkers('java');
  lsp?.dispose();
  lsp = null;
  revealRequest = null;
  st.set({
    project: null, tabs: [], activePath: null, caret: null, error: null,
    run: { session: null, output: [] }, lspStatus: 'off', lspMessage: null, diagnosticsCount: { errors: 0, warnings: 0 },
  });
  void ide.invoke('project.list', undefined).then((projects) => useIde.getState().set({ projects }));
  return true;
}

export async function openProject(dir: string): Promise<void> {
  const st = useIde.getState();
  try {
    const { project, needsTrust } = await ide.invoke('project.open', { path: dir });
    if (needsTrust) st.set({ trustPrompt: project, error: null });
    else await enterProject(project);
  } catch (e) {
    st.set({ error: `Ordner konnte nicht geöffnet werden: ${(e as Error).message}` });
  }
}

export async function trustAndEnter(project: Project): Promise<void> {
  const trusted = await ide.invoke('project.trust', { projectId: project.id });
  useIde.getState().set({ trustPrompt: null });
  await enterProject(trusted);
}

export async function enterSafeMode(project: Project): Promise<void> {
  useIde.getState().set({ trustPrompt: null });
  await enterProject(project);
}

async function enterProject(project: Project): Promise<void> {
  const st = useIde.getState();
  st.set({ project, tabs: [], activePath: null, error: null, run: { session: null, output: [] }, lspStatus: 'off' });
  const saved = await ide.invoke('editorState.load', { projectId: project.id });
  for (const t of saved) st.openTab(t.filePath);
  const active = saved.find((t) => t.active);
  if (active) st.set({ activePath: active.filePath });
  if (project.trusted) void startLanguageServer(project);
}

async function startLanguageServer(project: Project): Promise<void> {
  useIde.getState().set({ lspStatus: 'starting' });
  try {
    const { sessionId } = await ide.invoke('lsp.start', { projectId: project.id, languageId: 'java' });
    lsp?.dispose();
    lsp = new JavaLspClient(sessionId, (uri, range) => {
      const p = pathForUri(project, uri);
      if (p) openFile(p, range);
    });
    for (const { model } of models.values()) if (model.getLanguageId() === 'java') lsp.didOpen(model);
  } catch (e) {
    useIde.getState().set({ lspStatus: 'crashed', lspMessage: (e as Error).message });
  }
}

export function persistEditorState(): void {
  const { project, tabs, activePath } = useIde.getState();
  if (!project) return;
  void ide.invoke('editorState.save', {
    projectId: project.id,
    tabs: tabs.map((t) => ({ filePath: t.path, active: t.path === activePath, viewState: {} })),
  });
}

// ---------- run ----------

export async function runFile(path: string | null): Promise<void> {
  const st = useIde.getState();
  const project = st.project;
  if (!project) return;
  if (!project.trusted) {
    st.set({ error: 'Ausführen ist im sicheren Modus gesperrt. Öffne das Projekt erneut und vertraue ihm.' });
    return;
  }
  const config = path ? await ide.invoke('runConfig.fromContext', { projectId: project.id, filePath: path }) : null;
  const fallback = config ?? (await ide.invoke('runConfig.list', { projectId: project.id }))[0];
  if (!fallback) {
    st.set({ error: 'Keine Run-Konfiguration: Öffne eine Klasse mit einer main-Methode.' });
    return;
  }
  await saveAll();
  clearRun();
  st.set({ error: null });
  st.toggle('run', true);
  const session = await ide.invoke('run.start', { configId: fallback.id });
  adoptSession(session);
}

export async function stopRun(): Promise<void> {
  const s = useIde.getState().run.session;
  if (s) await ide.invoke('run.stop', { sessionId: s.id });
}
