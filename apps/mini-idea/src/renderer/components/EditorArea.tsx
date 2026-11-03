// S05 Editor: tabs, one Monaco editor that swaps models, save, run glyph in the gutter.
import { FileCode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { monaco, applyTheme } from '../monaco';
import { useIde } from '../store';
import { closeFile, getModel, persistEditorState, runFile, saveFile, takeRevealRequest } from '../actions';
import { Kbd } from './ui';

const MAIN_RE = /\bpublic\s+static\s+void\s+main\s*\(/;

export function EditorArea() {
  const tabs = useIde((s) => s.tabs);
  const activePath = useIde((s) => s.activePath);
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>());
  const glyphs = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  // Create the editor once.
  useEffect(() => {
    if (!host.current) return;
    applyTheme();
    const editor = monaco.editor.create(host.current, {
      model: null,
      automaticLayout: true,
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono'),
      fontSize: 13,
      lineHeight: 20,
      glyphMargin: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      // Bracket pair colours would bypass the design tokens.
      bracketPairColorization: { enabled: false },
      tabSize: 4,
      insertSpaces: true,
      fixedOverflowWidgets: true,
      accessibilitySupport: 'auto',
      ariaLabel: 'Code-Editor',
    });
    editorRef.current = editor;
    glyphs.current = editor.createDecorationsCollection([]);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const p = useIde.getState().activePath;
      if (p) void saveFile(p);
    });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F10, () => void runFile(useIde.getState().activePath));
    editor.onDidChangeCursorPosition((e) => useIde.getState().set({ caret: { line: e.position.lineNumber, column: e.position.column } }));
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target.element?.classList.contains('mi-run-glyph')) {
        void runFile(useIde.getState().activePath);
      }
    });
    const updateGlyphs = () => {
      const model = editor.getModel();
      if (!model || model.getLanguageId() !== 'java') return glyphs.current?.set([]);
      const match = model.findMatches(MAIN_RE.source, false, true, false, null, false)[0];
      glyphs.current?.set(
        match
          ? [{ range: match.range, options: { glyphMarginClassName: 'mi-run-glyph', glyphMarginHoverMessage: { value: 'Ausführen (Shift+F10)' } } }]
          : [],
      );
    };
    editor.onDidChangeModel(updateGlyphs);
    editor.onDidChangeModelContent(updateGlyphs);
    return () => editor.dispose();
  }, []);

  // Switch model when the active tab changes.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const prev = editor.getModel();
    const st = useIde.getState();
    if (prev && st.project) {
      const prevPath = [...st.tabs].find((t) => prev.uri.path.endsWith('/' + t.path))?.path;
      if (prevPath) viewStates.current.set(prevPath, editor.saveViewState());
    }
    if (!activePath) {
      editor.setModel(null);
      return;
    }
    let cancelled = false;
    setOpenError(null);
    getModel(activePath)
      .then(({ model }) => {
        if (cancelled) return;
        editor.setModel(model);
        const vs = viewStates.current.get(activePath);
        if (vs) editor.restoreViewState(vs);
        const reveal = takeRevealRequest(activePath);
        if (reveal) {
          editor.setSelection(reveal);
          editor.revealRangeInCenterIfOutsideViewport(reveal);
        }
        editor.focus();
      })
      .catch((e: Error) => {
        if (!cancelled) setOpenError(`„${activePath}“ konnte nicht geöffnet werden: ${e.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [activePath]);

  useEffect(() => {
    persistEditorState();
  }, [tabs.length, activePath]);

  const tabKeys = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.path === activePath);
    const go = (j: number) => useIde.getState().set({ activePath: tabs[(j + tabs.length) % tabs.length]!.path });
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section aria-label="Editor" className="flex min-h-0 min-w-0 flex-1 flex-col bg-editor-bg">
      {tabs.length > 0 && (
        <div role="tablist" aria-label="Geöffnete Dateien" onKeyDown={tabKeys} className="flex h-tab-h flex-none overflow-x-auto border-b border-border bg-surface">
          {tabs.map((t) => {
            const active = t.path === activePath;
            const name = t.path.split('/').pop();
            return (
              <div
                key={t.path}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                title={t.path}
                onClick={() => useIde.getState().set({ activePath: t.path })}
                onAuxClick={(e) => e.button === 1 && closeFile(t.path)}
                className={`group flex max-w-tab-w-max flex-none cursor-default items-center gap-6 border-r border-border pl-12 pr-6 ${active ? 'bg-editor-bg text-text shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-text-muted hover:bg-hover'}`}
              >
                <FileCode size={16} aria-hidden className="flex-none" />
                <span className="truncate">{name}</span>
                <button
                  aria-label={t.dirty ? `${name} schließen (ungespeichert)` : `${name} schließen`}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(t.path);
                  }}
                  className="grid h-icon-lg w-icon-lg flex-none place-items-center rounded-xs hover:bg-hover"
                >
                  {t.dirty ? (
                    <span aria-hidden className="h-6 w-6 rounded-pill bg-text-muted group-hover:hidden" />
                  ) : null}
                  <X size={12} aria-hidden className={t.dirty ? 'hidden group-hover:block' : active ? '' : 'invisible group-hover:visible'} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {openError && (
        <div role="alert" className="border-b border-border bg-danger-bg px-12 py-6 text-danger">
          {openError}
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div ref={host} className={`absolute inset-0 ${activePath ? '' : 'invisible'}`} />
        {!activePath && (
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-8 text-text-muted">
            <p>
              Datei im Projektbaum öffnen <Kbd>Enter</Kbd>
            </p>
            <p>
              Projektbaum <Kbd>Alt+1</Kbd>
            </p>
            <p>
              Ausführen <Kbd>Shift+F10</Kbd>
            </p>
            <p>
              Speichern <Kbd>Ctrl+S</Kbd>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
