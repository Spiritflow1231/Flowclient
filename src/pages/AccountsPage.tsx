import { CircleUserRound, Pencil, Plus, ShieldCheck, Trash2, UserRoundPlus } from 'lucide-react';
import type { MicrosoftAccount, PlayerProfile } from '../types';
import { PixelAvatar } from '../components/PixelAvatar';

export function AccountsPage({ profiles, activeId, accounts, activeAccountId, connecting, onCreate, onEdit, onDelete, onSelect, onConnect, onSelectAccount, onRemoveAccount }: {
  profiles: PlayerProfile[];
  activeId: string | null;
  accounts: MicrosoftAccount[];
  activeAccountId: string | null;
  connecting: boolean;
  onCreate: () => void;
  onEdit: (profile: PlayerProfile) => void;
  onDelete: (profile: PlayerProfile) => void;
  onSelect: (id: string) => void;
  onConnect: () => void;
  onSelectAccount: (id: string) => void;
  onRemoveAccount: (account: MicrosoftAccount) => void;
}) {
  return (
    <div className="page accounts-page">
      <header className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> PLAYER IDENTITY</div><h1>Accounts</h1><p>Connect a licensed Microsoft account to launch Minecraft Java Edition.</p></div><button className="primary-button" onClick={onConnect} disabled={connecting}><UserRoundPlus size={17} /> {connecting ? 'Waiting for Microsoft…' : 'Connect Microsoft account'}</button></header>
      <div className="local-notice"><ShieldCheck size={18} /><div><strong>Official Microsoft sign-in</strong><p>FlowClient uses Microsoft device-code authentication and checks Minecraft Java ownership. Tokens are kept in OS-protected encrypted storage and never saved in the profile data file.</p></div></div>
      <section className="accounts-section"><div className="section-heading"><div><span className="section-kicker">MICROSOFT ACCOUNTS</span><h2>Connected accounts</h2></div></div>
        {accounts.length ? <div className="player-profile-list">{accounts.map((account) => <article className={`player-profile-card ${account.id === activeAccountId ? 'is-active' : ''}`} key={account.id}><span className="account-placeholder"><CircleUserRound size={19} /></span><div className="player-profile-details"><div className="player-profile-name">{account.name}{account.id === activeAccountId && <span className="active-profile-badge"><span /> ACTIVE</span>}</div><code>{account.uuid}</code><small>Microsoft account · Java Edition verified</small></div><div className="player-profile-actions"><button className="secondary-button" onClick={() => onSelectAccount(account.id)}>{account.id === activeAccountId ? 'Selected' : 'Use for launch'}</button><button className="icon-button danger-icon" onClick={() => onRemoveAccount(account)} aria-label={`Disconnect ${account.name}`} title="Disconnect account"><Trash2 size={16} /></button></div></article>)}</div> : <div className="accounts-empty"><span><CircleUserRound size={25} /></span><h2>No Microsoft account connected</h2><p>Connect an account that owns Minecraft Java Edition before launching a profile.</p><button className="primary-button" onClick={onConnect} disabled={connecting}><UserRoundPlus size={16} /> Connect Microsoft account</button></div>}
      </section>
      <section className="accounts-section local-players-section"><div className="section-heading"><div><span className="section-kicker">LOCAL DISPLAY IDENTITIES</span><h2>Player profiles</h2></div><button className="secondary-button" onClick={onCreate}><Plus size={15} /> Add local player</button></div>
        <p className="local-players-caption">These names and avatars are saved locally for organization only. They cannot authenticate or be used to launch Minecraft.</p>
      {profiles.length ? <div className="player-profile-list">{profiles.map((profile) => <article className={`player-profile-card ${profile.id === activeId ? 'is-active' : ''}`} key={profile.id}><PixelAvatar preset={profile.avatar} name={profile.name} size="large" /><div className="player-profile-details"><div className="player-profile-name">{profile.name}{profile.id === activeId && <span className="active-profile-badge"><span /> ACTIVE</span>}</div><code>{profile.uuid}</code><small>Local player · Created {new Date(profile.createdAt).toLocaleDateString()}</small></div><div className="player-profile-actions"><button className="secondary-button" onClick={() => onSelect(profile.id)}>{profile.id === activeId ? <><CircleUserRound size={15} /> Selected</> : 'Set active'}</button><button className="icon-button" onClick={() => onEdit(profile)} aria-label={`Edit ${profile.name}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(profile)} aria-label={`Delete ${profile.name}`}><Trash2 size={16} /></button></div></article>)}</div> : <div className="accounts-empty"><span><CircleUserRound size={25} /></span><h2>No local players yet</h2><p>Create a local identity to keep player names and avatar preferences organized on this device.</p><button className="primary-button" onClick={onCreate}><Plus size={16} /> Add local player</button></div>}
      </section>
    </div>
  );
}
