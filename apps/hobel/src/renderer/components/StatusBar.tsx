// S35 Status bar: path, language server state, problems, caret, line ending.
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useIde } from '../store';

export function StatusBar() {
  const project = useIde((s) => s.project);
  const activePath = useIde((s) => s.activePath);
  const caret = useIde((s) => s.caret);
  const lspStatus = useIde((s) => s.lspStatus);
  const lspMessage = useIde((s) => s.lspMessage);
  const { errors, warnings } = useIde((s) => s.diagnosticsCount);

  const lspText =
    !project?.trusted ? 'Ohne Ausführen' : lspStatus === 'starting' ? 'Java: startet…' : lspStatus === 'crashed' ? 'Java: läuft nicht' : lspStatus === 'ready' ? (lspMessage ?? 'Java: bereit') : '';

  return (
    <footer className="flex h-statusbar-h flex-none items-center gap-2 border-t border-border bg-bg px-6 text-xs text-text-muted">
      <span className="truncate px-8">{project ? [project.name, ...(activePath?.split('/') ?? [])].join(' › ') : ''}</span>
      <span className="flex-1" />
      {(errors > 0 || warnings > 0) && (
        <span className="flex items-center gap-4 px-8" aria-label={`${errors} Fehler, ${warnings} Warnungen`}>
          <AlertCircle size={12} aria-hidden className="text-danger" />
          {errors}
          <AlertTriangle size={12} aria-hidden className="text-warning" />
          {warnings}
        </span>
      )}
      {lspText && (
        <span className="flex items-center gap-6 px-8" role="status" title={lspMessage ?? undefined}>
          {lspStatus === 'starting' && <Loader2 size={12} aria-hidden className="animate-spin" />}
          {lspStatus === 'crashed' && <AlertCircle size={12} aria-hidden className="text-danger" />}
          <span className="max-w-status-text-w-max truncate">{lspText}</span>
        </span>
      )}
      {caret && activePath && <span className="px-8">{caret.line}:{caret.column}</span>}
      {activePath && <span className="px-8">UTF-8</span>}
    </footer>
  );
}
