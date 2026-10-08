import type { AppData } from '../types';

const STORAGE_KEY = 'flowclient:launcher-data';

export const storageService = {
  async load(): Promise<Partial<AppData> | null> {
    if (window.flowclient) {
      return (await window.flowclient.readStorage()) as Partial<AppData> | null;
    }

    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Partial<AppData>) : null;
  },

  async save(data: AppData): Promise<void> {
    if (window.flowclient) {
      await window.flowclient.writeStorage(data);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
};
