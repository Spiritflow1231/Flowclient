import type { Loader, MinecraftProfile } from '../types';

export const minecraftVersions = ['1.21.4', '1.21.1', '1.20.1', '1.19.2', '1.18.2'];
export const loaders: Loader[] = ['Vanilla', 'Fabric'];

export function getCompatibleLoaders(version: string): Loader[] {
  return version ? loaders : ['Vanilla'];
}

export function getLoaderVersion(loader: Loader, minecraftVersion: string): string {
  if (loader === 'Vanilla') return minecraftVersion;
  return 'Latest compatible';
}

export function createDefaultProfile(): MinecraftProfile {
  const id = crypto.randomUUID();
  const version = '1.21.4';
  return {
    id,
    name: 'My First Profile',
    minecraftVersion: version,
    loader: 'Vanilla',
    loaderVersion: getLoaderVersion('Vanilla', version),
    javaVersion: 'Auto-detect at launch',
    javaPath: '',
    allocatedRam: 4,
    mods: [],
    resourcePacks: [],
    shaderPacks: [],
    selectedModpack: null,
    gameDirectory: `~/.minecraft/flowclient/${id}`,
    jvmArguments: '-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions',
    createdAt: new Date().toISOString(),
    lastPlayedAt: null,
  };
}
