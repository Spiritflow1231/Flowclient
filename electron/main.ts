import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  connectMicrosoftAccount,
  detectJava,
  getMinecraftVersions,
  launchMinecraft,
  removeMicrosoftAccount,
  stopMinecraft,
} from './launcher';
import type { LauncherSettings, MinecraftProfile } from './launcher-types';

const dataFile = () => path.join(app.getPath('userData'), 'flowclient-data.json');

app.setName('FlowClient');
app.setPath('userData', path.join(app.getPath('appData'), 'FlowClient'));

async function readData(): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(dataFile(), 'utf8')) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeData(data: unknown): Promise<void> {
  const file = dataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporaryFile = `${file}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temporaryFile, file);
}

let pendingWrite = Promise.resolve();

function queueWrite(data: unknown): Promise<void> {
  const write = pendingWrite.then(() => writeData(data));
  pendingWrite = write.catch(() => undefined);
  return write;
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: '#101211',
    title: 'FlowClient',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(app.getAppPath(), 'build', 'renderer', 'index.html'));
  }
}

ipcMain.handle('storage:read', readData);
ipcMain.handle('storage:write', (_event, data: unknown) => queueWrite(data));
ipcMain.handle('launcher:versions', getMinecraftVersions);
ipcMain.handle('launcher:java', detectJava);
ipcMain.handle('microsoft:connect', (event) => connectMicrosoftAccount(event.sender));
ipcMain.handle('microsoft:remove', (_event, accountId: unknown) => {
  if (typeof accountId !== 'string' || !accountId) throw new Error('A Microsoft account ID is required.');
  return removeMicrosoftAccount(accountId);
});
ipcMain.handle('minecraft:launch', (event, input: unknown) => {
  if (typeof input !== 'object' || input === null) throw new Error('A Minecraft profile is required to launch.');
  const request = input as { profile?: unknown; accountId?: unknown; settings?: unknown; profiles?: unknown };
  if (typeof request.profile !== 'object' || request.profile === null) throw new Error('A Minecraft profile is required to launch.');
  if (typeof request.settings !== 'object' || request.settings === null) throw new Error('Launcher settings are missing.');
  if (!Array.isArray(request.profiles)) throw new Error('The profile list is required to validate separate game directories.');
  const profile = request.profile as MinecraftProfile;
  const settings = request.settings as LauncherSettings;
  if (
    typeof profile.id !== 'string'
    || typeof profile.minecraftVersion !== 'string'
    || typeof profile.loader !== 'string'
    || typeof profile.javaPath !== 'string'
    || typeof profile.gameDirectory !== 'string'
    || typeof profile.jvmArguments !== 'string'
    || typeof profile.allocatedRam !== 'number'
    || !Array.isArray(profile.mods)
    || !Array.isArray(profile.resourcePacks)
    || !Array.isArray(profile.shaderPacks)
    || (profile.microsoftAccountId !== undefined && profile.microsoftAccountId !== null && typeof profile.microsoftAccountId !== 'string')
    || (profile.selectedModpack !== null && typeof profile.selectedModpack !== 'string')
  ) {
    throw new Error('The selected Minecraft profile is incomplete.');
  }
  const hasValidItems = (items: unknown[]) => items.every((item) => (
    typeof item === 'object'
    && item !== null
    && typeof (item as { enabled?: unknown }).enabled === 'boolean'
    && typeof (item as { name?: unknown }).name === 'string'
    && ((item as { filePath?: unknown }).filePath === undefined || typeof (item as { filePath?: unknown }).filePath === 'string')
  ));
  if (!hasValidItems(profile.mods) || !hasValidItems(profile.resourcePacks) || !hasValidItems(profile.shaderPacks)) {
    throw new Error('The profile contains an invalid local content item.');
  }
  if (
    typeof settings.minecraftDirectory !== 'string'
    || typeof settings.launcherDirectory !== 'string'
    || typeof settings.javaPath !== 'string'
  ) {
    throw new Error('Launcher storage or Java settings are invalid.');
  }
  if (request.accountId !== null && typeof request.accountId !== 'string') {
    throw new Error('The selected Microsoft account is invalid.');
  }
  if (!request.profiles.every((item) => (
    typeof item === 'object'
    && item !== null
    && typeof (item as { id?: unknown }).id === 'string'
    && ((item as { gameDirectory?: unknown }).gameDirectory === undefined || typeof (item as { gameDirectory?: unknown }).gameDirectory === 'string')
    && ((item as { name?: unknown }).name === undefined || typeof (item as { name?: unknown }).name === 'string')
  ))) {
    throw new Error('The profile list contains invalid profile data.');
  }
  return launchMinecraft(event.sender, profile, request.accountId, settings, request.profiles as MinecraftProfile[]);
});
ipcMain.handle('minecraft:stop', () => stopMinecraft());
ipcMain.handle('dialog:select-path', async (_event, kind: unknown) => {
  const properties: Array<'openDirectory' | 'createDirectory' | 'openFile'> = kind === 'file'
    ? ['openFile']
    : ['openDirectory', 'createDirectory'];
  const result = await dialog.showOpenDialog({ properties });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
