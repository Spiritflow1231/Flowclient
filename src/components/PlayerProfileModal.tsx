import { useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { avatarPresets, PixelAvatar } from './PixelAvatar';
import type { PlayerProfile } from '../types';

export function PlayerProfileModal({ initialProfile, onClose, onSave }: {
  initialProfile?: PlayerProfile;
  onClose: () => void;
  onSave: (profile: PlayerProfile) => void;
}) {
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [avatar, setAvatar] = useState(initialProfile?.avatar ?? avatarPresets[0]);
  const [error, setError] = useState('');

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!/^[A-Za-z0-9_]{1,16}$/.test(cleanName)) {
      setError('Use 1–16 letters, numbers, or underscores.');
      return;
    }
    onSave({
      id: initialProfile?.id ?? crypto.randomUUID(),
      name: cleanName,
      uuid: initialProfile?.uuid ?? crypto.randomUUID(),
      avatar,
      createdAt: initialProfile?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal player-modal" role="dialog" aria-modal="true" aria-labelledby="player-modal-title">
        <header className="modal-header"><div className="modal-icon modal-icon--player"><PixelAvatar preset={avatar} name={name || 'Player'} size="small" /></div><div><span className="section-kicker">LOCAL IDENTITY</span><h2 id="player-modal-title">{initialProfile ? 'Edit player' : 'Add local player'}</h2></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>
        <form onSubmit={save}><div className="modal-body">
          <label className="form-field"><span>Player name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Your local player name" maxLength={16} /><small>1–16 letters, numbers, or underscores.</small></label>
          <div className="form-field"><span>Choose an avatar</span><div className="avatar-picker">{avatarPresets.map((preset) => <button type="button" key={preset} className={`avatar-choice ${avatar === preset ? 'is-selected' : ''}`} onClick={() => setAvatar(preset)} aria-label={`${preset} avatar`}><PixelAvatar preset={preset} name={name || 'Player'} size="medium" />{avatar === preset && <span className="avatar-choice-check"><Check size={11} /></span>}</button>)}</div></div>
          <div className="local-identity-notice"><ShieldCheck size={16} /><p><strong>Local identity only.</strong> This stores a player name, local UUID, and avatar preference on this device. It does not sign in, authenticate, or grant access to online services.</p></div>
          {error && <div className="form-error">{error}</div>}
        </div><footer className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> Save player</button></footer></form>
      </section>
    </div>
  );
}
