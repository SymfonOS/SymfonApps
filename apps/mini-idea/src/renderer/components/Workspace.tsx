// S04 Main window: toolbar, tool window stripe, project tree, editor, run panel, status bar.
import { ChevronDown, FolderTree, Play, ShieldAlert, Square, TerminalSquare } from 'lucide-react';
import { useEffect } from 'react';
import { useIde, type ToolWindow } from '../store';
import { closeFile, closeProject, focusEditor, runFile, saveAll, stopRun } from '../actions';
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
        const wasVisible = useIde.getState().visible[tw.id];
        useIde.getState().toggle(tw.id);
        e.preventDefault();
        // Tool windows stay mounted while hidden (BUG-007), so their content can take focus at once.
        if (!wasVisible) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-toolwindow="${tw.id}"] [tabindex="0"]`)?.focus());
        else focusEditor();
      } else if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        void runFile(useIde.getState().activePath);
      } else if (e.ctrlKey && e.key === 'F4') {
        e.preventDefault();
        const p = useIde.getState().activePath;
        if (p) closeFile(p);
      } else if (e.ctrlKey && e.key === 'F2') {
        e.preventDefault();
        void stopRun();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveAll();
      } else if (e.key === 'Escape' && document.activeElement?.closest('[data-toolwindow]')) {
        focusEditor();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none border-b border-border bg-bg">
        <h1 className="sr-only">{project.name} – Mini-IDEA</h1>
        <div role="toolbar" aria-label="Hauptleiste" className="flex h-toolbar-h items-center gap-4 px-8">
          <button
            className="flex h-control-md items-center gap-6 rounded-sm px-8 font-semibold hover:bg-hover"
            title={project.rootPath}
            onClick={() => closeProject()}
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
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-8 border-t border-border bg-danger-bg px-12 py-6 text-danger">
            <span className="flex-1">{error}</span>
            <button className="text-link hover:underline" onClick={() => useIde.getState().set({ error: null })}>
              Schließen
            </button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Tool-Fenster" className="flex w-stripe-w flex-none border-r border-border bg-bg pt-6">
          <div role="toolbar" aria-label="Tool-Fenster" aria-orientation="vertical" className="flex w-full flex-col items-center gap-4">
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
          </div>
        </nav>

        <aside data-toolwindow="project" aria-label="Projekt" hidden={!visible.project} className="w-toolwindow-w-default flex-none flex-col border-r border-border bg-surface [&:not([hidden])]:flex">
          <h2 className="flex h-control-lg flex-none items-center border-b border-border px-12 text-sm font-semibold">Projekt</h2>
          <div className="min-h-0 flex-1">
            <ProjectTree />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <EditorArea />
          <section data-toolwindow="run" aria-label="Ausgabe" hidden={!visible.run} className="h-toolwindow-h-default flex-none flex-col border-t border-border bg-surface [&:not([hidden])]:flex">
            <h2 className="flex h-control-lg flex-none items-center border-b border-border px-12 text-sm font-semibold">Ausgabe</h2>
            <div className="min-h-0 flex-1">
              <RunPanel />
            </div>
          </section>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
