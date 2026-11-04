import { useEffect, useState } from 'react';
import { ide, useIde } from './store';
import { enterSafeMode, onExternalChange, persistEditorState, saveAll, trustAndEnter } from './actions';
import { UnsavedDialog } from './components/UnsavedDialog';
import { onRunOutput, onRunStatus } from './run-events';
import { Welcome } from './components/Welcome';
import { Workspace } from './components/Workspace';
import { TrustDialog } from './components/TrustDialog';

export function App() {
  const project = useIde((s) => s.project);
  const trustPrompt = useIde((s) => s.trustPrompt);
  const [closePrompt, setClosePrompt] = useState<string[] | null>(null);
  const quit = () => {
    persistEditorState();
    void ide.invoke('app.quit', undefined);
  };

  useEffect(() => {
    const offs = [
      ide.on('lsp.status', ({ status, message }) => useIde.getState().set({ lspStatus: status, lspMessage: message ?? null })),
      ide.on('run.output', ({ sessionId, stream, text }) => onRunOutput(sessionId, { stream, text })),
      ide.on('run.status', onRunStatus),
      ide.on('app.closeRequested', () => {
        const dirty = useIde.getState().tabs.filter((t) => t.dirty).map((t) => t.path);
        if (dirty.length === 0) quit();
        else setClosePrompt(dirty);
      }),
      ide.on('fs.changed', ({ projectId, paths }) => {
        if (useIde.getState().project?.id === projectId) void onExternalChange(paths);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <>
      {project ? <Workspace /> : <Welcome />}
      {trustPrompt && (
        <TrustDialog
          project={trustPrompt}
          onTrust={() => void trustAndEnter(trustPrompt)}
          onSafeMode={() => void enterSafeMode(trustPrompt)}
          onCancel={() => useIde.getState().set({ trustPrompt: null })}
        />
      )}
      {closePrompt && (
        <UnsavedDialog
          paths={closePrompt}
          onSaveAll={async () => {
            if (await saveAll()) quit();
            else setClosePrompt(useIde.getState().tabs.filter((t) => t.dirty).map((t) => t.path));
          }}
          onDiscard={quit}
          onCancel={() => setClosePrompt(null)}
        />
      )}
    </>
  );
}
