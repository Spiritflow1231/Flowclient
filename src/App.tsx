import { useEffect, useState } from 'react';
import { Check, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ProfileEditorModal } from './components/ProfileEditorModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LauncherLogPanel } from './components/LauncherLogPanel';
import { HomePage } from './pages/HomePage';
import { ProfilesPage } from './pages/ProfilesPage';
import { AccountsPage } from './pages/AccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LibraryPage } from './pages/LibraryPage';
import { createDefaultData } from './services/defaultData';
import { storageService } from './services/storage';
import { minecraftVersions as fallbackVersions } from './data/catalog';
import type { AppData, LauncherLogEntry, LauncherState, MinecraftProfile, MicrosoftAccount, PageId, PlayerProfile } from './types';

type ConfirmTarget = { type: 'minecraft'; profile: MinecraftProfile } | { type: 'player'; profile: PlayerProfile };

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [page, setPage] = useState<PageId>('home');
  const [editingProfile, setEditingProfile] = useState<MinecraftProfile | null | undefined>();
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null | undefined>();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [notice, setNotice] = useState<{ message: string; error: boolean; id: number } | null>(null);
  const [storageError, setStorageError] = useState('');
  const [availableVersions, setAvailableVersions] = useState<string[]>(fallbackVersions);
  const [launcherState, setLauncherState] = useState<LauncherState>({ phase: 'ready', profileId: null, processId: null, message: 'Ready' });
  const [launcherLogs, setLauncherLogs] = useState<LauncherLogEntry[]>([]);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');

  useEffect(() => {
    let mounted = true;
    storageService.load().then((stored) => {
      if (!mounted) return;
      if (!stored) {
        setData(createDefaultData());
        return;
      }
      const defaults = createDefaultData();
      const minecraftProfiles = Array.isArray(stored.minecraftProfiles) ? stored.minecraftProfiles : defaults.minecraftProfiles;
      const playerProfiles = Array.isArray(stored.playerProfiles) ? stored.playerProfiles : [];
      const microsoftAccounts = Array.isArray(stored.microsoftAccounts) ? stored.microsoftAccounts : [];
      setData({
        ...defaults,
        ...stored,
        minecraftProfiles,
        playerProfiles,
        microsoftAccounts,
        activeMinecraftProfileId: minecraftProfiles.some((profile) => profile.id === stored.activeMinecraftProfileId) ? stored.activeMinecraftProfileId ?? null : minecraftProfiles[0]?.id ?? null,
        activePlayerProfileId: playerProfiles.some((profile) => profile.id === stored.activePlayerProfileId) ? stored.activePlayerProfileId ?? null : null,
        activeMicrosoftAccountId: microsoftAccounts.some((account) => account.id === stored.activeMicrosoftAccountId) ? stored.activeMicrosoftAccountId ?? null : null,
        settings: { ...defaults.settings, ...stored.settings },
      });
    }).catch(() => {
      if (mounted) {
        setData(createDefaultData());
        setNotice({ message: 'Could not read saved data. A fresh local library was opened.', error: true, id: Date.now() });
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!window.flowclient) return;
    return window.flowclient.onLauncherEvent((event) => {
      const id = Date.now() + Math.random();
      setLauncherState((current) => ({
        phase: event.phase,
        profileId: event.profileId ?? current.profileId,
        processId: event.processId === undefined ? current.processId : event.processId,
        message: event.message,
      }));
      setLauncherLogs((current) => [...current, { id, phase: event.phase, message: event.message, error: event.error }].slice(-150));
      const code = event.message.match(/Enter code ([A-Z0-9-]+) at /i)?.[1];
      if (code) setDeviceCode(code);
      if (event.phase === 'ready' || event.phase === 'error') {
        if (event.phase === 'ready') setDeviceCode('');
      }
      if (event.phase === 'running' && event.message === 'Minecraft Running' && event.profileId) {
        setData((current) => current ? ({
          ...current,
          minecraftProfiles: current.minecraftProfiles.map((profile) => profile.id === event.profileId
            ? { ...profile, lastPlayedAt: new Date().toISOString() }
            : profile),
        }) : current);
      }
    });
  }, []);

  useEffect(() => {
    if (!window.flowclient) return;
    window.flowclient.getMinecraftVersions().then((versions) => {
      if (versions.length) setAvailableVersions(versions);
    }).catch((error: unknown) => {
      const message = `Could not fetch Minecraft versions: ${error instanceof Error ? error.message : String(error)}`;
      setNotice({ message, error: true, id: Date.now() });
      setLauncherLogs((current) => [...current, { id: Date.now() + Math.random(), phase: 'error' as const, message, error: true }].slice(-150));
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    storageService.save(data).then(() => setStorageError('')).catch(() => setStorageError('Local storage could not be updated. Check your device permissions.'));
  }, [data]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function toast(message: string, error = false) {
    setNotice({ message, error, id: Date.now() });
  }

  async function browsePath(kind: 'directory' | 'file'): Promise<string | null> {
    if (!window.flowclient) {
      toast('Path selection is available in the desktop launcher.', true);
      return null;
    }
    try {
      return await window.flowclient.selectPath(kind);
    } catch {
      toast('The system file picker could not be opened.', true);
      return null;
    }
  }

  if (!data) return <main className="boot-screen"><div className="boot-mark"><span className="brand-mark"><span /><span /><span /><span /></span><LoaderCircle className="boot-spinner" size={17} /> <span>WAKING UP YOUR WORLDS</span></div></main>;

  const appData = data;
  const activeProfile = appData.minecraftProfiles.find((profile) => profile.id === appData.activeMinecraftProfileId);
  const activeAccount = appData.microsoftAccounts.find((account) => account.id === activeProfile?.microsoftAccountId)
    ?? appData.microsoftAccounts.find((account) => account.id === appData.activeMicrosoftAccountId);

  function saveMinecraftProfile(profile: MinecraftProfile) {
    setData((current) => {
      if (!current) return current;
      const exists = current.minecraftProfiles.some((item) => item.id === profile.id);
      return {
        ...current,
        minecraftProfiles: exists ? current.minecraftProfiles.map((item) => item.id === profile.id ? profile : item) : [...current.minecraftProfiles, profile],
        activeMinecraftProfileId: current.activeMinecraftProfileId ?? profile.id,
      };
    });
    setEditingProfile(undefined);
    toast(editingProfile ? 'Profile changes saved.' : 'Your new profile is ready to configure.');
  }

  function savePlayerProfile(profile: PlayerProfile) {
    setData((current) => {
      if (!current) return current;
      const exists = current.playerProfiles.some((item) => item.id === profile.id);
      return {
        ...current,
        playerProfiles: exists ? current.playerProfiles.map((item) => item.id === profile.id ? profile : item) : [...current.playerProfiles, profile],
        activePlayerProfileId: current.activePlayerProfileId ?? profile.id,
      };
    });
    setEditingPlayer(undefined);
    toast(editingPlayer ? 'Local player updated.' : 'Local player saved on this device.');
  }

  function confirmDelete() {
    if (!confirmTarget) return;
    if (confirmTarget.type === 'minecraft') {
      const removedId = confirmTarget.profile.id;
      setData((current) => current ? {
        ...current,
        minecraftProfiles: current.minecraftProfiles.filter((profile) => profile.id !== removedId),
        activeMinecraftProfileId: current.activeMinecraftProfileId === removedId ? current.minecraftProfiles.find((profile) => profile.id !== removedId)?.id ?? null : current.activeMinecraftProfileId,
      } : current);
      toast('Profile permanently deleted.');
    } else {
      const removedId = confirmTarget.profile.id;
      setData((current) => current ? {
        ...current,
        playerProfiles: current.playerProfiles.filter((profile) => profile.id !== removedId),
        activePlayerProfileId: current.activePlayerProfileId === removedId ? current.playerProfiles.find((profile) => profile.id !== removedId)?.id ?? null : current.activePlayerProfileId,
      } : current);
      toast('Local player permanently deleted.');
    }
    setConfirmTarget(null);
  }

  function selectMinecraftProfile(id: string) {
    setData((current) => current ? { ...current, activeMinecraftProfileId: id } : current);
    toast('Active profile changed.');
  }

  async function connectMicrosoftAccount() {
    if (!window.flowclient) {
      toast('Microsoft account sign-in is available in the desktop launcher.', true);
      return;
    }
    setConnectingAccount(true);
    setDeviceCode('');
    setLauncherState({ phase: 'authenticating', profileId: null, processId: null, message: 'Waiting for Microsoft sign-in…' });
    try {
      const account = await window.flowclient.connectMicrosoftAccount();
      setData((current) => {
        if (!current) return current;
        const exists = current.microsoftAccounts.some((item) => item.id === account.id);
        return {
          ...current,
          microsoftAccounts: exists ? current.microsoftAccounts.map((item) => item.id === account.id ? account : item) : [...current.microsoftAccounts, account],
          activeMicrosoftAccountId: account.id,
        };
      });
      setDeviceCode('');
      setLauncherState({ phase: 'ready', profileId: null, processId: null, message: 'Microsoft account connected.' });
      setLauncherLogs((current) => [...current, { id: Date.now() + Math.random(), phase: 'authenticating' as const, message: `${account.name} signed in and Minecraft Java entitlement verified.` }].slice(-150));
      toast(`${account.name} connected and verified for Minecraft Java Edition.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLauncherState({ phase: 'error', profileId: null, processId: null, message });
      setLauncherLogs((current) => [...current, { id: Date.now() + Math.random(), phase: 'error' as const, message, error: true }].slice(-150));
      toast(message, true);
    } finally {
      setConnectingAccount(false);
    }
  }

  async function removeMicrosoftAccount(account: MicrosoftAccount) {
    if (!window.flowclient) return;
    try {
      await window.flowclient.removeMicrosoftAccount(account.id);
      setData((current) => current ? {
        ...current,
        microsoftAccounts: current.microsoftAccounts.filter((item) => item.id !== account.id),
        minecraftProfiles: current.minecraftProfiles.map((profile) => profile.microsoftAccountId === account.id
          ? { ...profile, microsoftAccountId: null }
          : profile),
        activeMicrosoftAccountId: current.activeMicrosoftAccountId === account.id
          ? current.microsoftAccounts.find((item) => item.id !== account.id)?.id ?? null
          : current.activeMicrosoftAccountId,
      } : current);
      toast(`${account.name} disconnected.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), true);
    }
  }

  async function playProfile(profile?: MinecraftProfile) {
    const target = profile ?? activeProfile;
    if (!target) {
      toast('Create or select a Minecraft profile before pressing PLAY.', true);
      return;
    }
    if (['authenticating', 'downloading', 'preparing', 'launching', 'running'].includes(launcherState.phase)) {
      toast('Minecraft is already starting or running.', true);
      return;
    }
    if (!window.flowclient) {
      toast('Minecraft launching is available in the desktop launcher.', true);
      return;
    }
    setData((current) => current ? { ...current, activeMinecraftProfileId: target.id } : current);
    try {
      await window.flowclient.launchMinecraft(target, appData.activeMicrosoftAccountId, appData.settings, appData.minecraftProfiles);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLauncherState((current) => current.phase === 'error'
        ? current
        : { phase: 'error', profileId: target.id, processId: null, message });
      setLauncherLogs((current) => [...current, { id: Date.now() + Math.random(), phase: 'error' as const, message, error: true }].slice(-150));
      toast(message, true);
    }
  }

  function renderPage() {
    if (page === 'home') return <HomePage profiles={appData.minecraftProfiles} activeProfile={activeProfile} activeAccount={activeAccount} settings={appData.settings} launcherState={launcherState} onPlay={() => { void playProfile(activeProfile); }} onPlayProfile={(profile) => { void playProfile(profile); }} onSelectProfile={selectMinecraftProfile} onNavigate={setPage} />;
    if (page === 'profiles') return <ProfilesPage profiles={appData.minecraftProfiles} activeId={appData.activeMinecraftProfileId} onCreate={() => setEditingProfile(null)} onEdit={setEditingProfile} onDelete={(profile) => setConfirmTarget({ type: 'minecraft', profile })} onSelect={selectMinecraftProfile} onPlay={playProfile} />;
    if (page === 'accounts') return <AccountsPage profiles={appData.playerProfiles} activeId={appData.activePlayerProfileId} accounts={appData.microsoftAccounts} activeAccountId={appData.activeMicrosoftAccountId} connecting={connectingAccount} onCreate={() => setEditingPlayer(null)} onEdit={setEditingPlayer} onDelete={(profile) => setConfirmTarget({ type: 'player', profile })} onSelect={(id) => { setData((current) => current ? { ...current, activePlayerProfileId: id } : current); toast('Active local player changed.'); }} onConnect={() => { void connectMicrosoftAccount(); }} onSelectAccount={(id) => { setData((current) => current ? { ...current, activeMicrosoftAccountId: id } : current); toast('Microsoft account selected for launch.'); }} onRemoveAccount={(account) => { void removeMicrosoftAccount(account); }} />;
    if (page === 'settings') return <SettingsPage settings={appData.settings} onChange={(settings) => setData((current) => current ? { ...current, settings } : current)} onBrowse={async (key) => { const path = await browsePath(key === 'javaPath' ? 'file' : 'directory'); if (path) setData((current) => current ? { ...current, settings: { ...current.settings, [key]: path } } : current); }} />;
    return <LibraryPage page={page} />;
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} onSettings={() => setPage('settings')} activeAccount={activeAccount} />
      <main className="main-area"><div className="window-drag-bar" /><div className="page-scroll" key={page}>{renderPage()}</div></main>
      <LauncherLogPanel state={launcherState} entries={launcherLogs} onClear={() => setLauncherLogs([])} onStop={() => { void window.flowclient?.stopMinecraft(); }} />
      {storageError && <div className="storage-warning"><CircleAlert size={16} /><span>{storageError}</span><button onClick={() => setStorageError('')} aria-label="Dismiss"><X size={15} /></button></div>}
      {notice && <div className={`toast ${notice.error ? 'toast--error' : ''}`} key={notice.id}><span className="toast-icon">{notice.error ? <CircleAlert size={16} /> : <Check size={16} />}</span><span>{notice.message}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={15} /></button></div>}
      {editingProfile !== undefined && <ProfileEditorModal initialProfile={editingProfile ?? undefined} defaultRam={appData.settings.defaultRam} versions={availableVersions} accounts={appData.microsoftAccounts} defaultAccountId={appData.activeMicrosoftAccountId} onClose={() => setEditingProfile(undefined)} onSave={saveMinecraftProfile} onBrowse={browsePath} onDetectJava={async () => { if (!window.flowclient) throw new Error('Java detection is available in the desktop launcher.'); return window.flowclient.detectJava(); }} />}
      {editingPlayer !== undefined && <PlayerProfileModal initialProfile={editingPlayer ?? undefined} onClose={() => setEditingPlayer(undefined)} onSave={savePlayerProfile} />}
      {confirmTarget && <ConfirmDialog title={confirmTarget.type === 'minecraft' ? `Delete “${confirmTarget.profile.name}”?` : `Delete ${confirmTarget.profile.name}?`} message={confirmTarget.type === 'minecraft' ? 'This removes the profile configuration from your local library. Any game files on disk will not be removed.' : 'This removes the local player identity from this device.'} onCancel={() => setConfirmTarget(null)} onConfirm={confirmDelete} />}
      {connectingAccount && <div className="auth-progress" role="status"><LoaderCircle size={15} className="boot-spinner" /><span>{deviceCode ? `Enter ${deviceCode} in the Microsoft window to continue.` : 'Opening official Microsoft sign-in…'}</span></div>}
    </div>
  );
}
