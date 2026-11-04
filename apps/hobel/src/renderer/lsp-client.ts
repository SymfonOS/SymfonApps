// Minimal LSP client for Monaco: document sync, diagnostics, completion, hover, definition.
// Requests go through main (`lsp.request`); notifications come back as `lsp.notification`.
import { monaco } from './monaco';
import { ide, useIde } from './store';

type LspPosition = { line: number; character: number };
type LspRange = { start: LspPosition; end: LspPosition };
interface LspDiagnostic { range: LspRange; severity?: number; message: string; source?: string; code?: string | number }
interface LspTextEdit { range: LspRange; newText: string }
interface LspCompletionItem {
  label: string | { label: string };
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: LspTextEdit | { insert: LspRange; replace: LspRange; newText: string };
  additionalTextEdits?: LspTextEdit[];
}
interface LspLocation { uri: string; range: LspRange }

const KIND_NAMES = [
  '', 'Text', 'Method', 'Function', 'Constructor', 'Field', 'Variable', 'Class', 'Interface', 'Module', 'Property',
  'Unit', 'Value', 'Enum', 'Keyword', 'Snippet', 'Color', 'File', 'Reference', 'Folder', 'EnumMember', 'Constant',
  'Struct', 'Event', 'Operator', 'TypeParameter',
] as const;

function completionKind(kind?: number): monaco.languages.CompletionItemKind {
  const name = KIND_NAMES[kind ?? 1] || 'Text';
  const kinds = monaco.languages.CompletionItemKind as unknown as Record<string, monaco.languages.CompletionItemKind>;
  return kinds[name] ?? monaco.languages.CompletionItemKind.Text;
}

const toRange = (r: LspRange) => new monaco.Range(r.start.line + 1, r.start.character + 1, r.end.line + 1, r.end.character + 1);
const toPos = (p: monaco.Position): LspPosition => ({ line: p.lineNumber - 1, character: p.column - 1 });
const severity = (s?: number) =>
  s === 1 ? monaco.MarkerSeverity.Error : s === 2 ? monaco.MarkerSeverity.Warning : s === 3 ? monaco.MarkerSeverity.Info : monaco.MarkerSeverity.Hint;

export class JavaLspClient {
  private versions = new Map<string, number>();
  private disposables: monaco.IDisposable[] = [];
  private unsubscribe: (() => void)[] = [];

  constructor(
    private sessionId: string,
    private onOpenLocation: (uri: monaco.Uri, range: monaco.IRange) => void,
  ) {
    this.unsubscribe.push(
      ide.on('lsp.notification', ({ sessionId: sid, method, params }) => {
        if (sid !== this.sessionId) return;
        if (method === 'textDocument/publishDiagnostics') this.applyDiagnostics(params as { uri: string; diagnostics: LspDiagnostic[] });
        if (method === 'language/status') {
          const p = params as { type: string; message: string };
          useIde.getState().set({ lspMessage: p.type === 'ServiceReady' ? null : p.message });
        }
      }),
    );
    this.registerProviders();
  }

  private request<T>(method: string, params: unknown): Promise<T> {
    return ide.invoke('lsp.request', { sessionId: this.sessionId, method, params }) as Promise<T>;
  }

  private notify(method: string, params: unknown): void {
    void ide.invoke('lsp.notify', { sessionId: this.sessionId, method, params }).catch(() => undefined);
  }

  didOpen(model: monaco.editor.ITextModel): void {
    const uri = model.uri.toString();
    if (this.versions.has(uri)) return;
    this.versions.set(uri, model.getVersionId());
    this.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'java', version: model.getVersionId(), text: model.getValue() } });
    this.disposables.push(
      model.onDidChangeContent(() => {
        this.versions.set(uri, model.getVersionId());
        // Full sync keeps the client small; JDT LS handles it fine for normal file sizes.
        this.notify('textDocument/didChange', { textDocument: { uri, version: model.getVersionId() }, contentChanges: [{ text: model.getValue() }] });
      }),
    );
  }

  didSave(model: monaco.editor.ITextModel): void {
    this.notify('textDocument/didSave', { textDocument: { uri: model.uri.toString() } });
  }

  didClose(model: monaco.editor.ITextModel): void {
    const uri = model.uri.toString();
    if (!this.versions.delete(uri)) return;
    this.notify('textDocument/didClose', { textDocument: { uri } });
  }

  private applyDiagnostics({ uri, diagnostics }: { uri: string; diagnostics: LspDiagnostic[] }): void {
    const model = monaco.editor.getModel(monaco.Uri.parse(uri));
    if (model) {
      monaco.editor.setModelMarkers(
        model,
        'java',
        diagnostics.map((d) => ({ ...toRange(d.range), severity: severity(d.severity), message: d.message, source: d.source, code: d.code?.toString() })),
      );
    }
    const all = monaco.editor.getModelMarkers({ owner: 'java' });
    useIde.getState().set({
      diagnosticsCount: {
        errors: all.filter((m) => m.severity === monaco.MarkerSeverity.Error).length,
        warnings: all.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length,
      },
    });
  }

  private registerProviders(): void {
    this.disposables.push(
      monaco.languages.registerCompletionItemProvider('java', {
        triggerCharacters: ['.', '@', '#'],
        provideCompletionItems: async (model, position) => {
          const version = model.getVersionId();
          const res = await this.request<{ items: LspCompletionItem[] } | LspCompletionItem[] | null>('textDocument/completion', {
            textDocument: { uri: model.uri.toString() },
            position: toPos(position),
          });
          // Drop answers for an older version of the document.
          if (model.isDisposed() || model.getVersionId() !== version) return { suggestions: [] };
          const items = Array.isArray(res) ? res : (res?.items ?? []);
          const word = model.getWordUntilPosition(position);
          const fallback = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
          return {
            suggestions: items.map((it) => {
              const label = typeof it.label === 'string' ? it.label : it.label.label;
              const edit = it.textEdit;
              const range = edit ? ('range' in edit ? toRange(edit.range) : toRange(edit.replace)) : fallback;
              return {
                label,
                kind: completionKind(it.kind),
                detail: it.detail,
                documentation: typeof it.documentation === 'string' ? it.documentation : it.documentation ? { value: it.documentation.value } : undefined,
                sortText: it.sortText,
                filterText: it.filterText,
                insertText: edit?.newText ?? it.insertText ?? label,
                insertTextRules: it.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
                range,
                additionalTextEdits: it.additionalTextEdits?.map((e) => ({ range: toRange(e.range), text: e.newText })),
              };
            }),
          };
        },
      }),
      monaco.languages.registerHoverProvider('java', {
        provideHover: async (model, position) => {
          const res = await this.request<{ contents: unknown; range?: LspRange } | null>('textDocument/hover', {
            textDocument: { uri: model.uri.toString() },
            position: toPos(position),
          });
          if (!res) return null;
          const parts = Array.isArray(res.contents) ? res.contents : [res.contents];
          const contents = parts
            .map((p) => (typeof p === 'string' ? p : (p as { value?: string; language?: string }).language ? '```java\n' + (p as { value: string }).value + '\n```' : ((p as { value?: string }).value ?? '')))
            .filter(Boolean)
            .map((value) => ({ value }));
          return contents.length ? { contents, range: res.range ? toRange(res.range) : undefined } : null;
        },
      }),
      monaco.languages.registerDefinitionProvider('java', {
        provideDefinition: async (model, position) => {
          const res = await this.request<LspLocation | LspLocation[] | null>('textDocument/definition', {
            textDocument: { uri: model.uri.toString() },
            position: toPos(position),
          });
          const locs = res ? (Array.isArray(res) ? res : [res]) : [];
          return locs.filter((l) => l.uri.startsWith('file:')).map((l) => ({ uri: monaco.Uri.parse(l.uri), range: toRange(l.range) }));
        },
      }),
      // Cross-file "go to definition": open the file as a tab instead of an inline peek.
      monaco.editor.registerEditorOpener({
        openCodeEditor: (_source, resource, selectionOrPosition) => {
          const range = selectionOrPosition && 'startLineNumber' in selectionOrPosition
            ? selectionOrPosition
            : selectionOrPosition
              ? new monaco.Range(selectionOrPosition.lineNumber, selectionOrPosition.column, selectionOrPosition.lineNumber, selectionOrPosition.column)
              : new monaco.Range(1, 1, 1, 1);
          this.onOpenLocation(resource, range);
          return true;
        },
      }),
    );
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.unsubscribe.forEach((u) => u());
  }
}
