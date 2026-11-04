import type { IdeApi } from '@shared/ipc';

declare global {
  interface Window {
    ide: IdeApi;
  }
}

export {};
