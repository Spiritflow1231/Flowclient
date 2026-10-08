import {
  Box,
  Boxes,
  CircleUserRound,
  Compass,
  Gamepad2,
  Layers2,
  PackageOpen,
  Settings2,
  Sparkles,
} from 'lucide-react';
import type { MicrosoftAccount, PageId } from '../types';

const navigation: { id: PageId; label: string; icon: typeof Gamepad2 }[] = [
  { id: 'home', label: 'Home', icon: Compass },
  { id: 'profiles', label: 'Profiles', icon: Gamepad2 },
  { id: 'mods', label: 'Mods', icon: Box },
  { id: 'modpacks', label: 'Modpacks', icon: PackageOpen },
  { id: 'resource-packs', label: 'Resource packs', icon: Layers2 },
  { id: 'shaders', label: 'Shaders', icon: Sparkles },
  { id: 'accounts', label: 'Accounts', icon: CircleUserRound },
];

export function Sidebar({ page, onNavigate, onSettings, activeAccount }: {
  page: PageId;
  onNavigate: (page: PageId) => void;
  onSettings: () => void;
  activeAccount: MicrosoftAccount | undefined;
}) {
  return (
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => onNavigate('home')} aria-label="FlowClient home">
        <span className="brand-mark"><span /><span /><span /><span /></span>
        <span className="brand-copy"><strong>flow<span>client</span></strong><small>JAVA EDITION</small></span>
      </button>

      <div className="nav-label">LAUNCHER</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-link ${page === id ? 'is-active' : ''}`} onClick={() => onNavigate(id)}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="nav-active-mark" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-divider" />
      <button className={`nav-link settings-link ${page === 'settings' ? 'is-active' : ''}`} onClick={onSettings}>
        <Settings2 size={18} strokeWidth={1.8} /><span>Settings</span>
      </button>
      <button className="account-switcher" onClick={() => onNavigate('accounts')}>
        <span className="account-placeholder"><CircleUserRound size={19} /></span>
        <span className="account-switcher-copy"><strong>{activeAccount?.name ?? 'No account'}</strong><small>{activeAccount ? 'Microsoft · Java verified' : 'Connect to play'}</small></span>
        <Boxes size={15} className="account-switcher-icon" />
      </button>
      <div className="sidebar-version">FLOWCLIENT <span>0.1.0</span></div>
    </aside>
  );
}
