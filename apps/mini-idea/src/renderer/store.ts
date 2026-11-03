import { create } from 'zustand';
import type { LspStatus, Project, RunSession } from '@shared/ipc';

export interface Tab {
  path: string;
  dirty: boolean;
}

export interface OutputLine {
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
}

export type ToolWindow = 'project' | 'run';

interface State {
  projects: Project[];
  project: Project | null;
  trustPrompt: Project | null;
  tabs: Tab[];
  activePath: string | null;
  /** Bumped for every "go to line" request, so the editor reveals even if the tab is already active. */
  revealNonce: number;
  caret: { line: number; column: number } | null;
  lspStatus: LspStatus;
  lspMessage: string | null;
  diagnosticsCount: { errors: number; warnings: number };
  visible: Record<ToolWindow, boolean>;
  run: { session: RunSession | null; output: OutputLine[] };
  error: string | null;

  set: (p: Partial<State>) => void;
  openTab: (path: string) => void;
  closeTab: (path: string) => void;
  setDirty: (path: string, dirty: boolean) => void;
  toggle: (w: ToolWindow, force?: boolean) => void;
  appendOutput: (line: OutputLine) => void;
}

const MAX_OUTPUT_LINES = 100_000;

export const useIde = create<State>((set) => ({
  projects: [],
  project: null,
  trustPrompt: null,
  tabs: [],
  activePath: null,
  revealNonce: 0,
  caret: null,
  lspStatus: 'off',
  lspMessage: null,
  diagnosticsCount: { errors: 0, warnings: 0 },
  visible: { project: true, run: false },
  run: { session: null, output: [] },
  error: null,

  set: (p) => set(p),
  openTab: (path) =>
    set((s) => ({ tabs: s.tabs.some((t) => t.path === path) ? s.tabs : [...s.tabs, { path, dirty: false }], activePath: path })),
  closeTab: (path) =>
    set((s) => {
      const i = s.tabs.findIndex((t) => t.path === path);
      const tabs = s.tabs.filter((t) => t.path !== path);
      const activePath = s.activePath === path ? (tabs[Math.min(i, tabs.length - 1)]?.path ?? null) : s.activePath;
      return { tabs, activePath };
    }),
  setDirty: (path, dirty) => set((s) => ({ tabs: s.tabs.map((t) => (t.path === path ? { ...t, dirty } : t)) })),
  toggle: (w, force) => set((s) => ({ visible: { ...s.visible, [w]: force ?? !s.visible[w] } })),
  appendOutput: (line) =>
    set((s) => {
      const output = s.run.output.length >= MAX_OUTPUT_LINES ? s.run.output.slice(-MAX_OUTPUT_LINES / 2) : s.run.output.slice();
      output.push(line);
      return { run: { ...s.run, output } };
    }),
}));

export const ide = window.ide;
