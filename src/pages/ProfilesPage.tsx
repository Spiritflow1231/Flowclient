import { ArrowDownUp, Boxes, CircleHelp, Clock3, MoreHorizontal, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { MinecraftProfile } from '../types';

export function ProfilesPage({ profiles, activeId, onCreate, onEdit, onDelete, onSelect, onPlay }: {
  profiles: MinecraftProfile[];
  activeId: string | null;
  onCreate: () => void;
  onEdit: (profile: MinecraftProfile) => void;
  onDelete: (profile: MinecraftProfile) => void;
  onSelect: (id: string) => void;
  onPlay: (profile: MinecraftProfile) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = profiles.filter((profile) => `${profile.name} ${profile.minecraftVersion} ${profile.loader}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="page profiles-page">
      <header className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR INSTALLATIONS</div><h1>Profiles<span className="heading-count">{profiles.length.toString().padStart(2, '0')}</span></h1><p>Separate setups for every world, server, and play style.</p></div><button className="primary-button create-profile-button" onClick={onCreate}><Plus size={17} /> Create profile</button></header>
      <div className="profiles-toolbar"><div className="profiles-summary"><Boxes size={16} /><span>{profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'} in your library</span></div><div className="toolbar-controls"><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a profile..." aria-label="Search profiles" /><kbd>⌘ K</kbd></label><button className="sort-button" title="Sort by name"><ArrowDownUp size={15} /><span>Name</span></button></div></div>
      {filtered.length > 0 ? <div className="profile-grid">{filtered.map((profile, index) => {
        const active = profile.id === activeId;
        return <article className={`profile-card ${active ? 'profile-card--active' : ''}`} key={profile.id} style={{ animationDelay: `${index * 55}ms` }}>
          <div className={`profile-card-art profile-card-art--${index % 4}`}><div className="profile-card-art-grid" /><div className="profile-version-stamp">{profile.minecraftVersion}</div><div className="profile-card-icon"><Boxes size={24} strokeWidth={1.45} /></div><div className="profile-card-art-word">WORLD<br />{(index + 1).toString().padStart(2, '0')}</div>{active && <span className="active-profile-badge"><span /> ACTIVE</span>}<button className="card-more icon-button" aria-label={`Edit ${profile.name}`} onClick={() => onEdit(profile)}><MoreHorizontal size={19} /></button></div>
          <div className="profile-card-body"><div className="profile-card-title-row"><div><h2>{profile.name}</h2><p>{profile.loader} <span>·</span> {profile.loaderVersion}</p></div><button className="profile-edit-small icon-button" onClick={() => onEdit(profile)} aria-label={`Edit ${profile.name}`}><Pencil size={15} /></button></div>
            <div className="profile-card-meta"><span><span className="profile-meta-dot" />{profile.allocatedRam} GB RAM</span><span><Clock3 size={13} />{profile.lastPlayedAt ? new Date(profile.lastPlayedAt).toLocaleDateString() : 'Not played yet'}</span></div>
            <div className="profile-card-actions"><button className="profile-play-button" onClick={() => onPlay(profile)}><Play size={14} fill="currentColor" /><span>PLAY</span></button><button className="profile-select-button" onClick={() => onSelect(profile.id)} disabled={active}>{active ? 'ACTIVE' : 'SET ACTIVE'}</button><button className="profile-delete-button icon-button" onClick={() => onDelete(profile)} aria-label={`Delete ${profile.name}`} title="Delete profile"><Trash2 size={16} /></button></div>
          </div>
        </article>;
      })}</div> : <div className="profiles-empty"><span className="empty-mark"><Boxes size={25} /></span><h2>{query ? 'No matching profiles' : 'A world for every idea'}</h2><p>{query ? 'Try a different name, version, or loader.' : 'Create your first profile and make it yours.'}</p>{!query && <button className="primary-button" onClick={onCreate}><Plus size={16} /> Create your first profile</button>}</div>}
      <div className="profiles-footnote"><CircleHelp size={14} /><span>Vanilla and Fabric installations download official game files into shared launcher storage with separate profile game directories.</span></div>
    </div>
  );
}
