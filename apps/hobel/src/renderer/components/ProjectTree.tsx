// S06 Project tool window: lazy file tree, keyboard driven (role=tree).
import { ChevronDown, ChevronRight, File, FileCode, Folder, FolderOpen } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DirEntry } from '@shared/ipc';
import { ide, useIde } from '../store';
import { openFile } from '../actions';

interface Row {
  entry: DirEntry;
  depth: number;
}

export function ProjectTree() {
  const project = useIde((s) => s.project)!;
  const activePath = useIde((s) => s.activePath);
  const [children, setChildren] = useState<Map<string, DirEntry[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));
  const [focused, setFocused] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const load = useCallback(
    async (dir: string) => {
      try {
        const entries = await ide.invoke('fs.readDir', { projectId: project.id, path: dir });
        setChildren((m) => new Map(m).set(dir, entries));
      } catch (e) {
        if (dir === '') setLoadError((e as Error).message);
      }
    },
    [project.id],
  );

  useEffect(() => {
    setChildren(new Map());
    setExpanded(new Set(['']));
    void load('');
  }, [load]);

  // Refresh loaded folders that contain changed paths.
  useEffect(
    () =>
      ide.on('fs.changed', ({ projectId, paths }) => {
        if (projectId !== project.id) return;
        const dirs = new Set(paths.map((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')));
        setChildren((m) => {
          for (const d of dirs) if (m.has(d)) void load(d);
          return m;
        });
      }),
    [project.id, load],
  );

  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (dir: string, depth: number) => {
      for (const entry of children.get(dir) ?? []) {
        out.push({ entry, depth });
        if (entry.kind === 'dir' && expanded.has(entry.path)) walk(entry.path, depth + 1);
      }
    };
    walk('', 0);
    return out;
  }, [children, expanded]);

  const toggleDir = (path: string, open?: boolean) => {
    const willOpen = open ?? !expanded.has(path);
    if (willOpen && !children.has(path)) void load(path);
    setExpanded((s) => {
      const next = new Set(s);
      if (willOpen) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const activate = (row: Row) => {
    if (row.entry.kind === 'dir') toggleDir(row.entry.path);
    else openFile(row.entry.path);
  };

  const focusIndex = Math.max(0, rows.findIndex((r) => r.entry.path === focused));

  useEffect(() => {
    document.getElementById(`tree-${focused}`)?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const row = rows[focusIndex];
    if (!row) return;
    const move = (i: number) => setFocused(rows[Math.max(0, Math.min(rows.length - 1, i))]!.entry.path);
    switch (e.key) {
      case 'ArrowDown': move(focusIndex + 1); break;
      case 'ArrowUp': move(focusIndex - 1); break;
      case 'Home': move(0); break;
      case 'End': move(rows.length - 1); break;
      case 'ArrowRight':
        if (row.entry.kind === 'dir') {
          if (!expanded.has(row.entry.path)) toggleDir(row.entry.path, true);
          else move(focusIndex + 1);
        }
        break;
      case 'ArrowLeft':
        if (row.entry.kind === 'dir' && expanded.has(row.entry.path)) toggleDir(row.entry.path, false);
        else {
          const parent = row.entry.path.includes('/') ? row.entry.path.slice(0, row.entry.path.lastIndexOf('/')) : null;
          if (parent) setFocused(parent);
        }
        break;
      case 'Enter': activate(row); break;
      default: return;
    }
    e.preventDefault();
  };

  if (loadError) return <p role="alert" className="p-12 text-danger">Ordner nicht lesbar: {loadError}</p>;
  if (!children.has('')) return <p className="p-12 text-text-muted">Lädt…</p>;
  if (rows.length === 0) return <p className="p-12 text-text-muted">Dieser Ordner ist leer.</p>;

  return (
    <ul
      ref={listRef}
      role="tree"
      aria-label={`Dateien in ${project.name}`}
      tabIndex={0}
      aria-activedescendant={rows[focusIndex] ? `tree-${rows[focusIndex].entry.path}` : undefined}
      onKeyDown={onKeyDown}
      onFocus={() => focused === null && rows[0] && setFocused(rows[0].entry.path)}
      className="focus-inset h-full overflow-auto py-4"
    >
      {rows.map((row, i) => {
        const { entry, depth } = row;
        const isDir = entry.kind === 'dir';
        const open = expanded.has(entry.path);
        const selected = entry.path === activePath;
        const isFocused = i === focusIndex && focused !== null;
        const Icon = isDir ? (open ? FolderOpen : Folder) : entry.name.endsWith('.java') ? FileCode : File;
        return (
          <li
            key={entry.path}
            id={`tree-${entry.path}`}
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={isDir ? open : undefined}
            aria-selected={selected}
            className={`flex h-row-h cursor-default items-center gap-6 whitespace-nowrap pr-8 ${selected ? 'bg-selection' : isFocused ? 'bg-selection-inactive' : 'hover:bg-hover'} ${entry.ignored ? 'text-text-disabled' : ''}`}
            style={{ paddingLeft: `calc(var(--space-2) + ${depth} * var(--size-tree-indent))` }}
            onClick={() => {
              setFocused(entry.path);
              if (isDir) toggleDir(entry.path);
            }}
            onDoubleClick={() => !isDir && openFile(entry.path)}
          >
            <span className="grid w-icon flex-none place-items-center text-text-muted" aria-hidden>
              {isDir ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
            </span>
            <Icon size={16} className="flex-none text-text-muted" aria-hidden />
            <span className="truncate">{entry.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
