import { useEffect } from 'react';
import { ide, useIde } from './store';
import { enterSafeMode, onExternalChange, trustAndEnter } from './actions';
import { Welcome } from './components/Welcome';
import { Workspace } from './components/Workspace';
import { TrustDialog } from './components/TrustDialog';

export function App() {
  const project = useIde((s) => s.project);
  const trustPrompt = useIde((s) => s.trustPrompt);

  useEffect(() => {
    const offs = [
      ide.on('lsp.status', ({ status, message }) => useIde.getState().set({ lspStatus: status, lspMessage: message ?? null })),
      ide.on('run.output', ({ sessionId, stream, text }) => {
        const st = useIde.getState();
        if (st.run.session && st.run.session.id !== sessionId) return;
        st.appendOutput({ stream, text });
      }),
      ide.on('run.status', (session) => {
        const st = useIde.getState();
        if (!st.run.session || st.run.session.id === session.id) st.set({ run: { ...st.run, session } });
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
    </>
  );
}
