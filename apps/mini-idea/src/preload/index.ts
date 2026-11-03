// Exposes a narrow, allowlisted IPC API to the renderer. No Node access leaks through.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { EVENT_CHANNELS, INVOKE_CHANNELS, type IdeApi } from '../shared/ipc';

const invokeAllowed = new Set<string>(INVOKE_CHANNELS);
const eventAllowed = new Set<string>(EVENT_CHANNELS);

const api: IdeApi = {
  invoke(channel, input) {
    if (!invokeAllowed.has(channel)) return Promise.reject(new Error(`channel not allowed: ${channel}`));
    return ipcRenderer.invoke(channel, input);
  },
  on(channel, listener) {
    if (!eventAllowed.has(channel)) throw new Error(`event not allowed: ${channel}`);
    const wrapped = (_e: IpcRendererEvent, payload: unknown) => listener(payload as never);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
};

contextBridge.exposeInMainWorld('ide', api);
