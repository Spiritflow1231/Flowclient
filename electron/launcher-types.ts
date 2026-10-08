export interface LauncherSettings {
  minecraftDirectory: string;
  javaPath: string;
  launcherDirectory: string;
}

interface LauncherItem {
  id: string;
  name: string;
  enabled: boolean;
  filePath?: string;
}

export interface MinecraftProfile {
  id: string;
  name?: string;
  minecraftVersion: string;
  loader: string;
  loaderVersion: string;
  javaPath: string;
  microsoftAccountId?: string | null;
  allocatedRam: number;
  mods: LauncherItem[];
  resourcePacks: LauncherItem[];
  shaderPacks: LauncherItem[];
  selectedModpack: string | null;
  gameDirectory: string;
  jvmArguments: string;
}

export interface MicrosoftAccount {
  id: string;
  name: string;
  uuid: string;
  createdAt: string;
}
