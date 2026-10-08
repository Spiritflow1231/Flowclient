import { ArrowDownRight, ArrowUpRight, ChevronDown, CircleHelp, CircleUserRound, Clock3, Cpu, HardDrive, Play, Plus, Settings2, Sparkles, Zap } from 'lucide-react';
import type { LauncherSettings, LauncherState, MinecraftProfile, MicrosoftAccount, PageId } from '../types';

export function HomePage({ profiles, activeProfile, activeAccount, settings, launcherState, onPlay, onPlayProfile, onSelectProfile, onNavigate }: {
  profiles: MinecraftProfile[];
  activeProfile: MinecraftProfile | undefined;
  activeAccount: MicrosoftAccount | undefined;
  settings: LauncherSettings;
  launcherState: LauncherState;
  onPlay: () => void;
  onPlayProfile: (profile: MinecraftProfile) => void;
  onSelectProfile: (id: string) => void;
  onNavigate: (page: PageId) => void;
}) {
  const launchBusy = ['authenticating', 'downloading', 'preparing', 'launching', 'running'].includes(launcherState.phase);
  const statusText = launcherState.phase === 'running' ? 'Minecraft Running' : launcherState.phase === 'ready' ? 'Ready' : launcherState.phase === 'error' ? launcherState.message : launcherState.message;
  return (
    <div className="page home-page">
      <header className="page-heading home-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR GAME, YOUR WAY</div><h1>Good to have you <span>back.</span></h1><p>Everything is in place. Pick a profile and get into your next world.</p></div>
        <button className="icon-button heading-help" title="FlowClient help" aria-label="Help"><CircleHelp size={18} /></button>
      </header>

      <section className="featured-profile">
        <div className="featured-texture" aria-hidden="true"><span className="texture-sun" /><span className="texture-hill texture-hill--back" /><span className="texture-hill texture-hill--front" /><span className="texture-grid" /></div>
        <div className="featured-content">
          <div className="feature-meta"><span className="live-dot" /> PROFILE SELECTED <span className="meta-separator">/</span> {activeProfile?.loader.toUpperCase() ?? 'VANILLA'}</div>
          <h2>{activeProfile?.name ?? 'No profile selected'}</h2>
          <div className="feature-tags"><span><span className="tiny-cube" /> Minecraft {activeProfile?.minecraftVersion ?? '—'}</span><span className="feature-tag-divider" /><span>{activeProfile?.loader ?? 'Choose a profile'}</span><span className="feature-tag-divider" /><span>{activeProfile?.allocatedRam ?? settings.defaultRam} GB RAM</span></div>
          <div className="feature-actions">
            <button className="play-button" onClick={onPlay} disabled={launchBusy}><Play size={17} fill="currentColor" /><span>{launchBusy ? (launcherState.phase === 'running' ? 'RUNNING' : 'WORKING…') : 'PLAY'}</span><span className="play-shortcut">↗</span></button>
            <label className="profile-select-wrap"><span>PLAY PROFILE</span><select value={activeProfile?.id ?? ''} onChange={(event) => onSelectProfile(event.target.value)} aria-label="Select Minecraft profile"><option value="" disabled>Select a profile</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><ChevronDown size={14} /></label>
          </div>
          <div className={`feature-note ${launcherState.phase === 'error' ? 'feature-note--error' : ''}`}><span className="note-line" /> {statusText}{launcherState.processId ? ` · PID ${launcherState.processId}` : ''}</div>
        </div>
        <div className="feature-coordinate"><span>01</span><span>FLOW / WORLD SELECT</span></div>
        <div className="feature-art-label">BLOCK<br />BY BLOCK</div>
      </section>

      <section className="section-heading home-section-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>Your setup</h2></div><button className="text-button" onClick={() => onNavigate('settings')}>Launcher settings <ArrowUpRight size={15} /></button></section>
      <section className="setup-grid">
        <div className="setup-card"><div className="setup-card-top"><span className="setup-icon"><HardDrive size={17} /></span><span className="setup-card-label">ALLOCATED MEMORY</span><span className="setup-status-dot" /></div><div className="setup-value">{activeProfile?.allocatedRam ?? settings.defaultRam}<span> GB</span></div><div className="setup-card-foot"><span className="memory-meter"><i style={{ width: `${Math.min(((activeProfile?.allocatedRam ?? settings.defaultRam) / 16) * 100, 100)}%` }} /></span><span>of 16 GB max</span></div></div>
        <div className="setup-card"><div className="setup-card-top"><span className="setup-icon setup-icon--orange"><Cpu size={17} /></span><span className="setup-card-label">JAVA RUNTIME</span><span className="setup-status-dot setup-status-dot--muted" /></div><div className="setup-value setup-value--small">{activeProfile?.javaPath ? activeProfile.javaVersion : 'Auto-detect at launch'}</div><div className="setup-card-foot"><span>{activeProfile?.javaPath ? 'Custom runtime · validated at launch' : 'System runtime · validated at launch'}</span><ArrowDownRight size={14} /></div></div>
        <div className="setup-card"><div className="setup-card-top"><span className="setup-icon setup-icon--violet"><Zap size={17} /></span><span className="setup-card-label">IN-GAME FPS</span><span className="setup-status-dot setup-status-dot--muted" /></div><div className="setup-value setup-value--small">—<span> FPS</span></div><div className="setup-card-foot"><span>Available once a game is running</span><Sparkles size={14} /></div></div>
      </section>

      <section className="home-bottom-grid">
        <div className="recent-panel"><div className="panel-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recently played</h2></div><Clock3 size={18} /></div>
          {profiles.filter((profile) => profile.lastPlayedAt).length > 0 ? profiles.filter((profile) => profile.lastPlayedAt).slice(0, 3).map((profile) => <div className="recent-row" key={profile.id}><span className="recent-cube"><HardDrive size={17} /></span><span className="recent-copy"><strong>{profile.name}</strong><small>Minecraft {profile.minecraftVersion} · {profile.loader}</small></span><span className="recent-date">{new Date(profile.lastPlayedAt!).toLocaleDateString()}</span><button className="icon-button" onClick={() => onPlayProfile(profile)} aria-label={`Play ${profile.name}`}><Play size={15} /></button></div>) : <div className="empty-recent"><span className="empty-recent-icon"><Clock3 size={20} /></span><div><strong>Your next world starts here</strong><p>{profiles.length ? 'Your played profiles will show up here.' : 'Create a profile to set up your first world.'}</p></div><button className="text-button" onClick={() => onNavigate('profiles')}>Browse profiles <ArrowUpRight size={14} /></button></div>}
        </div>
        <div className="player-panel"><div className="panel-heading"><div><span className="section-kicker">PLAYER IDENTITY</span><h2>Microsoft account</h2></div><button className="icon-button" onClick={() => onNavigate('accounts')} aria-label="Manage accounts"><Settings2 size={17} /></button></div>
          {activeAccount ? <div className="active-player"><span className="account-avatar-large"><CircleUserRound size={23} /></span><div><strong>{activeAccount.name}</strong><span>Microsoft · Java Edition verified</span><code>{activeAccount.uuid.slice(0, 8)}…</code></div></div> : <div className="no-player"><span className="no-player-icon"><Plus size={19} /></span><div><strong>No account connected</strong><span>Connect a Microsoft account that owns Java Edition.</span></div><button className="add-player-button" onClick={() => onNavigate('accounts')}>Connect <ArrowUpRight size={13} /></button></div>}
        </div>
      </section>
      <div className="home-footer"><span>FLOWCLIENT <span className="footer-divider">/</span> LOCAL-FIRST MINECRAFT LAUNCHER</span><span><span className="footer-dot" /> ALL LOCAL DATA STAYS ON THIS DEVICE</span></div>
    </div>
  );
}
