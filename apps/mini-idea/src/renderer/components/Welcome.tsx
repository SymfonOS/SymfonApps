// S01 Welcome screen: recent projects, open a folder.
import { FolderOpen, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '@shared/ipc';
import { ide, useIde } from '../store';
import { Button } from './ui';
import { openProject } from '../actions';

const tileHue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 8, 0);
const TILE = ['syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-type', 'syntax-function', 'syntax-constant', 'syntax-annotation', 'link'];

export function Welcome() {
  const projects = useIde((s) => s.projects);
  const error = useIde((s) => s.error);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    void ide.invoke('project.list', undefined).then((projects) => useIde.getState().set({ projects }));
  }, []);

  const shown = useMemo(
    () => projects.filter((p) => `${p.name} ${p.rootPath}`.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  );

  const pickAndOpen = async () => {
    const dir = await ide.invoke('project.pickFolder', undefined);
    if (dir) await openProject(dir);
  };

  const remove = async (p: Project) => {
    await ide.invoke('project.remove', { projectId: p.id });
    useIde.getState().set({ projects: await ide.invoke('project.list', undefined) });
  };

  return (
    <div className="flex h-full">
      <nav aria-label="Willkommen" className="w-sidebar-w border-r border-border bg-surface p-12">
        <h1 className="mb-16 px-8 text-lg font-semibold">Mini-IDEA</h1>
        <div className="flex h-row-h-lg items-center rounded-sm bg-selection px-8">Projekte</div>
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-12 p-24">
        <div className="flex items-center gap-8">
          <label className="flex h-control-md flex-1 items-center gap-8 rounded-sm border border-border-input bg-editor-bg px-8 focus-within:border-focus-ring">
            <Search size={16} className="text-text-muted" aria-hidden />
            <span className="sr-only">Projekte filtern</span>
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Projekte filtern"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
            />
          </label>
          <Button variant="primary" onClick={pickAndOpen}>
            <FolderOpen size={16} aria-hidden />
            Ordner öffnen
          </Button>
        </div>
        {error && (
          <div role="alert" className="rounded-sm border border-danger bg-danger-bg px-12 py-8 text-danger">
            {error}
          </div>
        )}
        {projects.length === 0 ? (
          <div className="grid flex-1 place-content-center justify-items-center gap-8 text-center text-text-muted">
            <p className="text-base text-text">Noch keine Projekte</p>
            <p>Öffne einen Ordner mit Java-Code, um loszulegen.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="p-16 text-text-muted">Kein Projekt passt zu „{query}“.</p>
        ) : (
          <ul
            role="listbox"
            aria-label="Zuletzt geöffnete Projekte"
            aria-keyshortcuts="Enter Delete"
            tabIndex={0}
            aria-activedescendant={shown[selected] ? `recent-${shown[selected].id}` : undefined}
            className="focus-inset flex flex-col overflow-auto rounded-sm"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setSelected((i) => Math.min(i + 1, shown.length - 1));
              else if (e.key === 'ArrowUp') setSelected((i) => Math.max(i - 1, 0));
              else if (e.key === 'Enter' && shown[selected]) void openProject(shown[selected].rootPath);
              else if (e.key === 'Delete' && shown[selected] && confirm(`„${shown[selected].name}“ aus der Liste entfernen?`)) void remove(shown[selected]);
              else return;
              e.preventDefault();
            }}
          >
            {shown.map((p, i) => (
              // Remove is a mouse shortcut beside the option (Delete key for keyboard); a button
              // inside role=option is unreachable for screen readers (BUG-008).
              <li key={p.id} role="none" className="group relative">
                <div
                  id={`recent-${p.id}`}
                  role="option"
                  aria-selected={i === selected}
                  className={`flex h-list-row-h-xl cursor-default items-center gap-12 rounded-sm px-8 ${i === selected ? 'bg-selection' : 'hover:bg-hover'}`}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => void openProject(p.rootPath)}
                >
                  <span
                    aria-hidden
                    className="grid h-tile w-tile flex-none place-items-center rounded-md text-xs font-semibold text-bg"
                    style={{ background: `var(--color-${TILE[tileHue(p.name)]})` }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-text-muted">{p.rootPath}</span>
                  </span>
                </div>
                <button
                  aria-hidden
                  tabIndex={-1}
                  title={`${p.name} aus der Liste entfernen`}
                  className="invisible absolute right-8 top-12 grid h-control-sm w-control-sm place-items-center rounded-sm text-text-muted hover:bg-hover group-hover:visible"
                  onClick={() => void remove(p)}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
