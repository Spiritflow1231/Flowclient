import { contextBridge, ipcRenderer } from 'electron';

interface LauncherEvent {
  phase: 'ready' | 'authenticating' | 'downloading' | 'preparing' | 'launching' | 'running' | 'error';
  message: string;
  error?: boolean;
  profileId?: string | null;
  processId?: number | null;
}

contextBridge.exposeInMainWorld('flowclient', {
  readStorage: () => ipcRenderer.invoke('storage:read'),
  writeStorage: (data: unknown) => ipcRenderer.invoke('storage:write', data),
  selectPath: (kind: 'directory' | 'file') => ipcRenderer.invoke('dialog:select-path', kind) as Promise<string | null>,
  getMinecraftVersions: () => ipcRenderer.invoke('launcher:versions') as Promise<string[]>,
  detectJava: () => ipcRenderer.invoke('launcher:java'),
  connectMicrosoftAccount: () => ipcRenderer.invoke('microsoft:connect'),
  removeMicrosoftAccount: (accountId: string) => ipcRenderer.invoke('microsoft:remove', accountId),
  launchMinecraft: (profile: unknown, accountId: string | null, settings: unknown, profiles: unknown) => ipcRenderer.invoke('minecraft:launch', { profile, accountId, settings, profiles }),
  stopMinecraft: () => ipcRenderer.invoke('minecraft:stop'),
  onLauncherEvent: (listener: (event: LauncherEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: LauncherEvent) => listener(value);
    ipcRenderer.on('launcher:event', handler);
    return () => ipcRenderer.removeListener('launcher:event', handler);
  },
});
