// Input validation for every IPC invoke channel. Main rejects anything that does not parse.
import { z } from 'zod';
import type { InvokeChannel, InvokeMap } from '../shared/ipc';

const id = z.string().min(1).max(200);
const relPath = z.string().max(4096);
export const schemas: { [C in InvokeChannel]: z.ZodType<InvokeMap[C]['in']> } = {
  'project.list': z.void(),
  'project.pickFolder': z.void(),
  'project.open': z.object({ path: z.string().min(1).max(4096) }),
  'project.trust': z.object({ projectId: id }),
  'project.remove': z.object({ projectId: id }),
  'fs.readDir': z.object({ projectId: id, path: relPath }),
  'fs.readFile': z.object({ projectId: id, path: relPath }),
  'fs.writeFile': z.object({ projectId: id, path: relPath, content: z.string(), expectedMtime: z.number().nullable() }),
  'editorState.load': z.object({ projectId: id }),
  'editorState.save': z.object({
    projectId: id,
    tabs: z.array(z.object({ filePath: relPath, active: z.boolean(), viewState: z.unknown() })).max(200),
  }),
  'lsp.start': z.object({ projectId: id, languageId: z.literal('java') }),
  'lsp.request': z.object({ sessionId: id, method: z.string().max(200), params: z.unknown() }),
  'lsp.notify': z.object({ sessionId: id, method: z.string().max(200), params: z.unknown() }),
  'runConfig.list': z.object({ projectId: id }),
  'runConfig.fromContext': z.object({ projectId: id, filePath: relPath }),
  'run.start': z.object({ configId: id }),
  'run.stop': z.object({ sessionId: id }),
} as never;

