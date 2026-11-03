// Typed IPC contract between renderer and main (replica/architecture.md → API).
// Every invoke channel has an input and output type; main validates inputs with zod.

export interface Project {
  id: string;
  name: string;
  rootPath: string;
  trusted: boolean;
  lastOpenedAt: number | null;
}

export interface DirEntry {
  name: string;
  path: string; // relative to project root, '/' separated
  kind: 'file' | 'dir';
  ignored: boolean;
}

export interface FileContent {
  content: string;
  mtime: number;
  lineEnding: 'LF' | 'CRLF';
}

export interface EditorTabState {
  filePath: string;
  active: boolean;
  viewState: unknown;
}

export interface RunConfiguration {
  id: string;
  projectId: string;
  name: string;
  type: 'application';
  options: { mainClass: string; sourceRoot: string };
  args: string;
  vmOptions: string;
  temporary: boolean;
}

export type RunStatus = 'starting' | 'running' | 'exited' | 'failed' | 'killed';

export interface RunSession {
  id: string;
  configId: string | null;
  configName: string;
  status: RunStatus;
  exitCode: number | null;
  startedAt: number;
}

export type LspStatus = 'off' | 'starting' | 'ready' | 'crashed';

export interface InvokeMap {
  'project.list': { in: void; out: Project[] };
  'project.pickFolder': { in: void; out: string | null };
  'project.open': { in: { path: string }; out: { project: Project; needsTrust: boolean } };
  'project.trust': { in: { projectId: string }; out: Project };
  'project.remove': { in: { projectId: string }; out: void };
  'fs.readDir': { in: { projectId: string; path: string }; out: DirEntry[] };
  'fs.readFile': { in: { projectId: string; path: string }; out: FileContent };
  'fs.writeFile': {
    in: { projectId: string; path: string; content: string; expectedMtime: number | null };
    out: { mtime: number } | { conflict: true; diskMtime: number };
  };
  'editorState.load': { in: { projectId: string }; out: EditorTabState[] };
  'editorState.save': { in: { projectId: string; tabs: EditorTabState[] }; out: void };
  'lsp.start': { in: { projectId: string; languageId: 'java' }; out: { sessionId: string } };
  'lsp.request': { in: { sessionId: string; method: string; params: unknown }; out: unknown };
  'lsp.notify': { in: { sessionId: string; method: string; params: unknown }; out: void };
  'runConfig.list': { in: { projectId: string }; out: RunConfiguration[] };
  'runConfig.fromContext': { in: { projectId: string; filePath: string }; out: RunConfiguration | null };
  'run.start': { in: { configId: string }; out: RunSession };
  'run.stop': { in: { sessionId: string }; out: void };
  /** The renderer agreed to close (nothing unsaved, or the user decided). */
  'app.quit': { in: void; out: void };
}

export interface EventMap {
  'fs.changed': { projectId: string; paths: string[] };
  'lsp.notification': { sessionId: string; method: string; params: unknown };
  'lsp.status': { sessionId: string; status: LspStatus; message?: string };
  'run.output': { sessionId: string; stream: 'stdout' | 'stderr' | 'system'; text: string };
  'run.status': RunSession;
  /** The user asked to close the window; the renderer decides about unsaved files. */
  'app.closeRequested': Record<string, never>;
}

export type InvokeChannel = keyof InvokeMap;
export type EventChannel = keyof EventMap;

export const INVOKE_CHANNELS = [
  'project.list', 'project.pickFolder', 'project.open', 'project.trust', 'project.remove',
  'fs.readDir', 'fs.readFile', 'fs.writeFile',
  'editorState.load', 'editorState.save',
  'lsp.start', 'lsp.request', 'lsp.notify',
  'runConfig.list', 'runConfig.fromContext', 'run.start', 'run.stop', 'app.quit',
] as const satisfies readonly InvokeChannel[];

export const EVENT_CHANNELS = [
  'fs.changed', 'lsp.notification', 'lsp.status', 'run.output', 'run.status', 'app.closeRequested',
] as const satisfies readonly EventChannel[];

export interface IdeApi {
  invoke<C extends InvokeChannel>(channel: C, input: InvokeMap[C]['in']): Promise<InvokeMap[C]['out']>;
  on<C extends EventChannel>(channel: C, listener: (payload: EventMap[C]) => void): () => void;
}
