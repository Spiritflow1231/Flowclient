export type Loader = 'Vanilla' | 'Fabric' | 'Forge' | 'NeoForge' | 'Quilt';

export interface InstalledItem {
  id: string;
  name: string;
  enabled: boolean;
  filePath?: string;
}

export interface MinecraftProfile {
  id: string;
  name: string;
  minecraftVersion: string;
  loader: Loader;
  loaderVersion: string;
  javaVersion: string;
  javaPath: string;
  microsoftAccountId?: string | null;
  allocatedRam: number;
  mods: InstalledItem[];
  resourcePacks: InstalledItem[];
  shaderPacks: InstalledItem[];
  selectedModpack: string | null;
  gameDirectory: string;
  jvmArguments: string;
  createdAt: string;
  lastPlayedAt: string | null;
}

export interface PlayerProfile {
  id: string;
  name: string;
  uuid: string;
  avatar: string;
  createdAt: string;
}

export interface MicrosoftAccount {
  id: string;
  name: string;
  uuid: string;
  createdAt: string;
}

export interface JavaInstallation {
  path: string;
  version: number;
}

export type LauncherPhase = 'ready' | 'authenticating' | 'downloading' | 'preparing' | 'launching' | 'running' | 'error';

export interface LauncherLogEntry {
  id: number;
  phase: LauncherPhase;
  message: string;
  error?: boolean;
}

export interface LauncherState {
  phase: LauncherPhase;
  profileId: string | null;
  processId: number | null;
  message: string;
}

export interface LauncherSettings {
  minecraftDirectory: string;
  javaPath: string;
  defaultRam: number;
  launcherDirectory: string;
  downloadDirectory: string;
  theme: 'dark' | 'light' | 'system';
  language: string;
  closeBehavior: 'exit' | 'minimize';
}

export interface AppData {
  minecraftProfiles: MinecraftProfile[];
  playerProfiles: PlayerProfile[];
  microsoftAccounts: MicrosoftAccount[];
  activeMinecraftProfileId: string | null;
  activePlayerProfileId: string | null;
  activeMicrosoftAccountId: string | null;
  settings: LauncherSettings;
}

export type PageId =
  | 'home'
  | 'profiles'
  | 'mods'
  | 'modpacks'
  | 'resource-packs'
  | 'shaders'
  | 'accounts'
  | 'settings';
