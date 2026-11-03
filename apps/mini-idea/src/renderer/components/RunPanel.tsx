// S17 Run tool window: streamed output, stack-trace links, rerun and stop.
import { Play, RotateCw, Square, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useRef } from 'react';
import { useIde } from '../store';
import { openFile, runFile, stopRun } from '../actions';
import { IconButton } from './ui';

// "at com.example.Main.main(Main.java:12)" → link to the file in the project.
const TRACE_RE = /\(([\w$]+\.java):(\d+)\)/g;

function Linkified({ text }: { text: string }) {
  const parts: (string | { file: string; line: number })[] = [];
  let last = 0;
  for (const m of text.matchAll(TRACE_RE)) {
    parts.push(text.slice(last, m.index));
    parts.push({ file: m[1]!, line: Number(m[2]) });
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <Fragment key={i}>
            (
            <button className="text-link underline-offset-2 hover:underline" onClick={() => void openTrace(p.file, p.line)}>
              {p.file}:{p.line}
            </button>
            )
          </Fragment>
        ),
      )}
    </>
  );
}

async function openTrace(file: string, line: number): Promise<void> {
  const st = useIde.getState();
  // Prefer an open tab with that name, then search the run's source root via the tree's naming.
  const hit = st.tabs.find((t) => t.path.endsWith('/' + file) || t.path === file);
  const path = hit?.path ?? (await findFile(file));
  if (path) openFile(path, { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 });
}

async function findFile(name: string): Promise<string | null> {
  const project = useIde.getState().project;
  if (!project) return null;
  const queue = [''];
  while (queue.length) {
    const dir = queue.shift()!;
    const entries = await window.ide.invoke('fs.readDir', { projectId: project.id, path: dir }).catch(() => []);
    for (const e of entries) {
      if (e.kind === 'file' && e.name === name) return e.path;
      if (e.kind === 'dir' && !e.ignored && !e.name.startsWith('.')) queue.push(e.path);
    }
  }
  return null;
}

export function RunPanel() {
  const { session, output } = useIde((s) => s.run);
  const activePath = useIde((s) => s.activePath);
  const scroller = useRef<HTMLDivElement>(null);
  const running = session?.status === 'running' || session?.status === 'starting';

  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight;
  }, [output.length]);

  const statusText = !session
    ? null
    : session.status === 'starting'
      ? 'startet…'
      : session.status === 'running'
        ? 'läuft'
        : session.status === 'killed'
          ? 'gestoppt'
          : `beendet (Code ${session.exitCode})`;

  return (
    <div className="flex h-full min-h-0">
      <div role="toolbar" aria-label="Ausführen" aria-orientation="vertical" className="flex flex-none flex-col gap-2 border-r border-border p-4">
        <IconButton label="Erneut ausführen" shortcut="Shift+F10" onClick={() => void runFile(activePath)}>
          {session ? <RotateCw size={16} aria-hidden /> : <Play size={16} aria-hidden className="text-success" />}
        </IconButton>
        <IconButton label="Stoppen" shortcut="Ctrl+F2" disabled={!running} onClick={() => void stopRun()}>
          <Square size={16} aria-hidden className={running ? 'text-danger' : ''} />
        </IconButton>
        <IconButton label="Ausgabe leeren" disabled={output.length === 0} onClick={() => useIde.getState().set({ run: { session, output: [] } })}>
          <Trash2 size={16} aria-hidden />
        </IconButton>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {session && (
          <div className="flex-none px-12 py-2 text-xs text-text-muted" aria-live="polite">
            {session.configName}: {statusText}
          </div>
        )}
        <div
          ref={scroller}
          role="log"
          aria-label="Programmausgabe"
          tabIndex={0}
          className="focus-inset min-h-0 flex-1 select-text overflow-auto whitespace-pre-wrap break-all bg-editor-bg px-12 py-4 font-mono text-code"
        >
          {output.length === 0 && !session ? (
            <span className="font-sans text-text-muted">Noch nichts ausgeführt. Öffne eine Klasse mit main-Methode und drücke Shift+F10.</span>
          ) : (
            output.map((l, i) => (
              <span key={i} className={l.stream === 'stderr' ? 'text-danger' : l.stream === 'system' ? 'text-text-muted' : ''}>
                <Linkified text={l.text} />
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
