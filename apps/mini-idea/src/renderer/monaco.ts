// Monaco setup: local worker (no CDN), and an editor theme built from the design tokens.
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
const hex = (name: string) => cssVar(name).replace('#', '');

export function applyTheme(): void {
  const dark = document.documentElement.dataset.theme !== 'light';
  monaco.editor.defineTheme('mini-idea', {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: hex('syntax-variable') },
      { token: 'keyword', foreground: hex('syntax-keyword') },
      { token: 'string', foreground: hex('syntax-string') },
      { token: 'number', foreground: hex('syntax-number') },
      { token: 'comment', foreground: hex('syntax-comment'), fontStyle: 'italic' },
      { token: 'type', foreground: hex('syntax-type') },
      { token: 'type.identifier', foreground: hex('syntax-type') },
      { token: 'annotation', foreground: hex('syntax-annotation') },
      { token: 'constant', foreground: hex('syntax-constant') },
    ],
    colors: {
      'editor.background': cssVar('editor-bg'),
      'editor.foreground': cssVar('text'),
      'editor.lineHighlightBackground': cssVar('editor-line'),
      'editor.selectionBackground': cssVar('editor-selection'),
      'editorLineNumber.foreground': cssVar('line-number'),
      'editorLineNumber.activeForeground': cssVar('line-number-active'),
      'editorCursor.foreground': cssVar('text'),
      'editorGutter.background': cssVar('gutter-bg'),
      'editorError.foreground': cssVar('danger'),
      'editorWarning.foreground': cssVar('warning'),
      'editorInfo.foreground': cssVar('info'),
      'editorWidget.background': cssVar('surface-raised'),
      'editorWidget.border': cssVar('border'),
      'editorSuggestWidget.background': cssVar('surface-raised'),
      'editorSuggestWidget.border': cssVar('border'),
      'editorSuggestWidget.selectedBackground': cssVar('selection'),
      'editorSuggestWidget.highlightForeground': cssVar('link'),
      'editorHoverWidget.background': cssVar('surface-raised'),
      'editorHoverWidget.border': cssVar('border'),
      focusBorder: cssVar('focus-ring'),
    },
  });
  monaco.editor.setTheme('mini-idea');
}

export { monaco };
