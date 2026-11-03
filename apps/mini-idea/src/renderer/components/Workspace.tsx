// S04 Main window: toolbar, tool window stripe, project tree, editor, run panel, status bar.
import { ChevronDown, FolderTree, Play, ShieldAlert, Square, TerminalSquare } from 'lucide-react';
import { useEffect } from 'react';
import { useIde, type ToolWindow } from '../store';
import { runFile, saveAll, stopRun } from '../actions';
import { EditorArea } from './EditorArea';
import { ProjectTree } from './ProjectTree';
import { RunPanel } from './RunPanel';
import { StatusBar } from './StatusBar';
import { IconButton } from './ui';

const TOOL_WINDOWS: { id: ToolWindow; label: string; shortcut: string; key: string; icon: typeof FolderTree }[] = [
  { id: 'project', label: 'Projekt', shortcut: 'Alt+1', key: '1', icon: FolderTree },
  { id: 'run', label: 'Ausgabe', shortcut: 'Alt+4', key: '4', icon: TerminalSquare },
];

export function Workspace() {
  const project = useIde((s) => s.project)!;
  const visible = useIde((s) => s.visible);
  const session = useIde((s) => s.run.session);
  const activePath = useIde((s) => s.activePath);
  const error = useIde((s) => s.error);
  const running = session?.status === 'running' || session?.status === 'starting';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tw = TOOL_WINDOWS.find((w) => e.altKey && !e.ctrlKey && !e.shiftKey && e.key === w.key);
      if (tw) {
        const st = useIde.getState();
        st.toggle(tw.id);
        e.preventDefault();
        if (!st.visible[tw.id]) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-toolwindow="${tw.id}"] [tabindex="0"]`)?.focus());
      } else if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        void runFile(useIde.getState().activePath);
      } else if (e.ctrlKey && e.key === 'F2') {
        e.preventDefault();
        void stopRun();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveAll();
      } else if (e.key === 'Escape' && document.activeElement?.closest('[data-toolwindow]')) {
        (document.querySelector('.monaco-editor textarea') as HTMLElement | null)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header role="toolbar" aria-label="Hauptleiste" className="flex h-toolbar-h flex-none items-center gap-4 border-b border-border bg-bg px-8">
        <button
          className="flex h-control-md items-center gap-6 rounded-sm px-8 font-semibold hover:bg-hover"
          title={project.rootPath}
          onClick={() => useIde.getState().set({ project: null, tabs: [], activePath: null })}
        >
          {project.name}
          <ChevronDown size={12} aria-hidden />
          <span className="sr-only">Projekt schließen und zur Übersicht</span>
        </button>
        {!project.trusted && (
          <span className="flex items-center gap-4 rounded-sm bg-warning-bg px-8 py-2 text-xs text-warning">
            <ShieldAlert size={12} aria-hidden /> Sicherer Modus
          </span>
        )}
        <span className="flex-1" />
        <IconButton label="Ausführen" shortcut="Shift+F10" disabled={!project.trusted} onClick={() => void runFile(activePath)}>
          <Play size={16} aria-hidden className={project.trusted ? 'text-success' : ''} />
        </IconButton>
        <IconButton label="Stoppen" shortcut="Ctrl+F2" disabled={!running} onClick={() => void stopRun()}>
          <Square size={16} aria-hidden className={running ? 'text-danger' : ''} />
        </IconButton>
      </header>

      {error && (
        <div role="alert" className="flex flex-none items-center gap-8 border-b border-border bg-danger-bg px-12 py-6 text-danger">
          <span className="flex-1">{error}</span>
          <button className="text-link hover:underline" onClick={() => useIde.getState().set({ error: null })}>
            Schließen
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <nav role="toolbar" aria-label="Tool-Fenster" aria-orientation="vertical" className="flex w-stripe-w flex-none flex-col items-center gap-4 border-r border-border bg-bg pt-6">
          {TOOL_WINDOWS.map((w) => (
            <IconButton
              key={w.id}
              label={w.label}
              shortcut={w.shortcut}
              pressed={visible[w.id]}
              className="relative h-control-lg w-control-lg"
              onClick={() => useIde.getState().toggle(w.id)}
            >
              {visible[w.id] && <span aria-hidden className="absolute -left-4 bottom-6 top-6 w-2 rounded-pill bg-accent" />}
              <w.icon size={20} aria-hidden />
            </IconButton>
          ))}
        </nav>

        {visible.project && (
          <aside data-toolwindow="project" aria-label="Projekt" className="flex w-toolwindow-w-default flex-none flex-col border-r border-border bg-surface">
            <div className="flex h-control-lg flex-none items-center border-b border-border px-12 font-semibold">Projekt</div>
            <div className="min-h-0 flex-1">
              <ProjectTree />
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorArea />
          {visible.run && (
            <section data-toolwindow="run" aria-label="Ausgabe" className="flex h-toolwindow-h-default flex-none flex-col border-t border-border bg-surface">
              <div className="flex h-control-lg flex-none items-center border-b border-border px-12 font-semibold">Ausgabe</div>
              <div className="min-h-0 flex-1">
                <RunPanel />
              </div>
            </section>
          )}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
