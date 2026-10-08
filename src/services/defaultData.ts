import { createDefaultProfile } from '../data/catalog';
import type { AppData } from '../types';

export function createDefaultData(): AppData {
  const profile = createDefaultProfile();
  return {
    minecraftProfiles: [profile],
    playerProfiles: [],
    microsoftAccounts: [],
    activeMinecraftProfileId: profile.id,
    activePlayerProfileId: null,
    activeMicrosoftAccountId: null,
    settings: {
      minecraftDirectory: '~/.minecraft',
      javaPath: '',
      defaultRam: 4,
      launcherDirectory: '~/.flowclient',
      downloadDirectory: '~/Downloads',
      theme: 'dark',
      language: 'en',
      closeBehavior: 'exit',
    },
  };
}
