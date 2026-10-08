import type {
  AppData,
  JavaInstallation,
  LauncherSettings,
  MinecraftProfile,
  MicrosoftAccount,
} from './index';

interface LauncherIpcEvent {
  phase: 'ready' | 'authenticating' | 'downloading' | 'preparing' | 'launching' | 'running' | 'error';
  message: string;
  error?: boolean;
  profileId?: string | null;
  processId?: number | null;
}

declare global {
  interface Window {
    flowclient?: {
      readStorage: () => Promise<unknown>;
      writeStorage: (data: AppData) => Promise<void>;
      selectPath: (kind: 'directory' | 'file') => Promise<string | null>;
      getMinecraftVersions: () => Promise<string[]>;
      detectJava: () => Promise<JavaInstallation[]>;
      connectMicrosoftAccount: () => Promise<MicrosoftAccount>;
      removeMicrosoftAccount: (accountId: string) => Promise<void>;
      launchMinecraft: (profile: MinecraftProfile, accountId: string | null, settings: LauncherSettings, profiles: MinecraftProfile[]) => Promise<void>;
      stopMinecraft: () => Promise<void>;
      onLauncherEvent: (listener: (event: LauncherIpcEvent) => void) => () => void;
    };
  }
}

export {};
