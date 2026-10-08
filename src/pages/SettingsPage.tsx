import { FolderOpen, HardDrive, Info, RotateCcw, Settings2 } from 'lucide-react';
import type { LauncherSettings } from '../types';

type SettingsPath = 'minecraftDirectory' | 'launcherDirectory' | 'downloadDirectory' | 'javaPath';

export function SettingsPage({ settings, onChange, onBrowse }: { settings: LauncherSettings; onChange: (settings: LauncherSettings) => void; onBrowse: (key: SettingsPath) => void }) {
  const update = <K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="page settings-page">
      <header className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> PREFERENCES</div><h1>Settings</h1><p>Make FlowClient feel at home on your machine.</p></div><span className="settings-header-icon"><Settings2 size={20} /></span></header>
      <div className="settings-layout"><nav className="settings-nav"><a className="settings-nav-item is-current" href="#storage"><HardDrive size={16} /> Storage & paths</a><a className="settings-nav-item" href="#performance"><RotateCcw size={16} /> Performance</a><a className="settings-nav-item" href="#appearance"><Info size={16} /> Appearance</a></nav>
        <div className="settings-content">
          <section className="settings-section" id="storage"><div className="settings-section-heading"><div><span className="section-kicker">01 / DIRECTORIES</span><h2>Storage & paths</h2></div><p>Choose where FlowClient keeps game files.</p></div>
            <label className="setting-field"><span className="setting-label">Minecraft directory <small>Game assets and shared libraries</small></span><span className="path-input"><input value={settings.minecraftDirectory} onChange={(event) => update('minecraftDirectory', event.target.value)} /><button type="button" title="Browse folder" onClick={() => onBrowse('minecraftDirectory')}><FolderOpen size={16} /></button></span></label>
            <label className="setting-field"><span className="setting-label">Launcher directory <small>Profiles and launcher data</small></span><span className="path-input"><input value={settings.launcherDirectory} onChange={(event) => update('launcherDirectory', event.target.value)} /><button type="button" title="Browse folder" onClick={() => onBrowse('launcherDirectory')}><FolderOpen size={16} /></button></span></label>
            <label className="setting-field"><span className="setting-label">Download directory <small>Temporary downloads</small></span><span className="path-input"><input value={settings.downloadDirectory} onChange={(event) => update('downloadDirectory', event.target.value)} /><button type="button" title="Browse folder" onClick={() => onBrowse('downloadDirectory')}><FolderOpen size={16} /></button></span></label>
          </section>
          <section className="settings-section" id="performance"><div className="settings-section-heading"><div><span className="section-kicker">02 / PERFORMANCE</span><h2>Memory & Java</h2></div><p>Defaults for newly created profiles.</p></div>
            <div className="setting-field"><span className="setting-label">Default memory <small>Allocated RAM per profile</small></span><div className="setting-control setting-control--ram"><input type="range" min="2" max="16" step="1" value={settings.defaultRam} onChange={(event) => update('defaultRam', Number(event.target.value))} aria-label="Default memory allocation" /><span>{settings.defaultRam}<small>GB</small></span></div></div>
            <label className="setting-field"><span className="setting-label">Java executable <small>Leave blank to use your system default</small></span><span className="path-input"><input value={settings.javaPath} onChange={(event) => update('javaPath', event.target.value)} placeholder="/path/to/java" /><button type="button" title="Browse file" onClick={() => onBrowse('javaPath')}><FolderOpen size={16} /></button></span></label>
          </section>
          <section className="settings-section" id="appearance"><div className="settings-section-heading"><div><span className="section-kicker">03 / PREFERENCES</span><h2>Appearance & behavior</h2></div><p>Personalize the launcher.</p></div>
            <label className="setting-field"><span className="setting-label">Theme <small>Interface color scheme</small></span><select className="setting-select" value={settings.theme} onChange={(event) => update('theme', event.target.value as LauncherSettings['theme'])}><option value="dark">Dark</option><option value="light">Light (coming soon)</option><option value="system">Follow system (coming soon)</option></select></label>
            <label className="setting-field"><span className="setting-label">Language <small>Launcher display language</small></span><select className="setting-select" value={settings.language} onChange={(event) => update('language', event.target.value)}><option value="en">English</option></select></label>
            <label className="setting-field"><span className="setting-label">When closing FlowClient <small>Choose what happens when you close the window</small></span><select className="setting-select" value={settings.closeBehavior} onChange={(event) => update('closeBehavior', event.target.value as LauncherSettings['closeBehavior'])}><option value="exit">Exit launcher</option><option value="minimize">Minimize to tray (coming soon)</option></select></label>
          </section>
          <div className="settings-save-note"><span className="settings-save-dot" /> Changes save automatically on this device.</div>
        </div>
      </div>
    </div>
  );
}
