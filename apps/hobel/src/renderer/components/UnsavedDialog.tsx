// Asked when the window is closed with unsaved files (BUG-002). Save all is the default.
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';

export function UnsavedDialog({ paths, onSaveAll, onDiscard, onCancel }: { paths: string[]; onSaveAll: () => Promise<void>; onDiscard: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
    saveBtn.current?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-desc"
      className="w-dialog-w-sm rounded-lg border border-border bg-surface p-0 text-text shadow-dialog backdrop:bg-[rgba(0,0,0,.5)]"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="unsaved-title" className="px-16 pb-6 pt-16 text-lg font-semibold">
        Noch nicht gespeichert
      </h2>
      <div id="unsaved-desc" className="grid gap-8 px-16 pb-16 text-text-muted">
        <p>{paths.length === 1 ? 'Diese Datei wurde geändert und noch nicht gespeichert:' : `Diese ${paths.length} Dateien wurden geändert und noch nicht gespeichert:`}</p>
        <ul className="max-h-toolwindow-h-default overflow-auto font-mono text-xs text-text">
          {paths.map((p) => (
            <li key={p} className="truncate" title={p}>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end gap-8 border-t border-border px-16 py-12">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Weiterarbeiten
        </Button>
        <Button variant="danger" onClick={onDiscard} disabled={saving}>
          Verwerfen und beenden
        </Button>
        <Button
          ref={saveBtn}
          variant="primary"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSaveAll();
            } finally {
              setSaving(false);
            }
          }}
        >
          Speichern und beenden
        </Button>
      </div>
    </dialog>
  );
}
