// "Trust this project?" — nothing that runs project code starts before the user says yes.
import { useEffect, useRef } from 'react';
import type { Project } from '@shared/ipc';
import { Button } from './ui';

export function TrustDialog({ project, onTrust, onSafeMode, onCancel }: { project: Project; onTrust: () => void; onSafeMode: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const trustBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    trustBtn.current?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="trust-title"
      className="w-dialog-w-sm rounded-lg border border-border bg-surface p-0 text-text shadow-dialog backdrop:bg-[rgba(0,0,0,.5)]"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="trust-title" className="px-16 pb-6 pt-16 text-lg font-semibold">
        Projekt „{project.name}“ vertrauen?
      </h2>
      <div className="grid gap-8 px-16 pb-16 text-text-muted">
        <p>Beim Laden und Ausführen kann Code aus diesem Ordner laufen, etwa Build-Skripte. Vertraue nur Projekten, deren Herkunft du kennst.</p>
        <p className="truncate text-xs" title={project.rootPath}>
          {project.rootPath}
        </p>
        <p className="text-xs">Im sicheren Modus kannst du Dateien lesen und bearbeiten. Code-Analyse und Ausführen bleiben aus.</p>
      </div>
      <div className="flex justify-end gap-8 border-t border-border px-16 py-12">
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={onSafeMode}>Sicherer Modus</Button>
        <Button ref={trustBtn} variant="primary" onClick={onTrust}>
          Vertrauen und öffnen
        </Button>
      </div>
    </dialog>
  );
}
