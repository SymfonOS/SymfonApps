// Routes run output/status to the run panel. Only the session the user started last is shown.
// Events of sessions we do not know yet are held back briefly: a new run's first lines can
// arrive before `run.start` has told us its id, while a replaced run's last lines must be
// dropped (BUG-005).
import type { RunSession } from '@shared/ipc';
import { useIde, type OutputLine } from './store';

const MAX_HELD_SESSIONS = 4;
const MAX_HELD_LINES = 2000;
const held = new Map<string, { lines: OutputLine[]; status: RunSession | null }>();

function hold(sessionId: string) {
  let h = held.get(sessionId);
  if (!h) {
    h = { lines: [], status: null };
    held.set(sessionId, h);
    while (held.size > MAX_HELD_SESSIONS) held.delete(held.keys().next().value!);
  }
  return h;
}

export function onRunOutput(sessionId: string, line: OutputLine): void {
  const st = useIde.getState();
  if (st.run.session?.id === sessionId) st.appendOutput(line);
  else {
    const h = hold(sessionId);
    if (h.lines.length < MAX_HELD_LINES) h.lines.push(line);
  }
}

export function onRunStatus(session: RunSession): void {
  const st = useIde.getState();
  if (st.run.session?.id === session.id) st.set({ run: { ...st.run, session } });
  else hold(session.id).status = session;
}

/** Called with the result of `run.start`: show this session, replay what arrived early, forget the rest. */
export function adoptSession(session: RunSession): void {
  const h = held.get(session.id);
  held.clear();
  const st = useIde.getState();
  st.set({ run: { session: h?.status ?? session, output: [] } });
  for (const line of h?.lines ?? []) useIde.getState().appendOutput(line);
}

/** A new run is being started: nothing is current until its id is known. */
export function clearRun(): void {
  held.clear();
  useIde.getState().set({ run: { session: null, output: [] } });
}
