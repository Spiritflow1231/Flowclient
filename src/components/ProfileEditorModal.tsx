import { useState } from 'react';
import { Check, ChevronDown, FolderOpen, HardDrive, Info, X } from 'lucide-react';
import { getCompatibleLoaders, getLoaderVersion, loaders, minecraftVersions } from '../data/catalog';
import type { InstalledItem, JavaInstallation, Loader, MinecraftProfile, MicrosoftAccount } from '../types';

export function ProfileEditorModal({ initialProfile, defaultRam, versions, accounts, defaultAccountId, onClose, onSave, onBrowse, onDetectJava }: {
  initialProfile?: MinecraftProfile;
  defaultRam: number;
  versions: string[];
  accounts: MicrosoftAccount[];
  defaultAccountId: string | null;
  onClose: () => void;
  onSave: (profile: MinecraftProfile) => void;
  onBrowse: (kind: 'directory' | 'file') => Promise<string | null>;
  onDetectJava: () => Promise<JavaInstallation[]>;
}) {
  const isEditing = Boolean(initialProfile);
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [version, setVersion] = useState(initialProfile?.minecraftVersion ?? minecraftVersions[0]);
  const compatibleLoaders = getCompatibleLoaders(version);
  const initialLoader = initialProfile?.loader ?? 'Vanilla';
  const [loader, setLoader] = useState<Loader>(compatibleLoaders.includes(initialLoader) || initialProfile ? initialLoader : 'Vanilla');
  const loaderChoices = compatibleLoaders.includes(loader) ? compatibleLoaders : [loader, ...compatibleLoaders];
  const [ram, setRam] = useState(initialProfile?.allocatedRam ?? defaultRam);
  const [gameDirectory, setGameDirectory] = useState(initialProfile?.gameDirectory ?? '');
  const [javaPath, setJavaPath] = useState(initialProfile?.javaPath ?? '');
  const [accountId, setAccountId] = useState(initialProfile?.microsoftAccountId ?? defaultAccountId ?? '');
  const [jvmArguments, setJvmArguments] = useState(initialProfile?.jvmArguments ?? '-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions');
  const [mods, setMods] = useState(initialProfile?.mods ?? []);
  const [resourcePacks, setResourcePacks] = useState(initialProfile?.resourcePacks ?? []);
  const [shaderPacks, setShaderPacks] = useState(initialProfile?.shaderPacks ?? []);
  const [error, setError] = useState('');
  const [javaInstallations, setJavaInstallations] = useState<JavaInstallation[]>([]);
  const [detectingJava, setDetectingJava] = useState(false);
  const [javaDetectionComplete, setJavaDetectionComplete] = useState(false);

  async function addFileItem(category: 'mods' | 'resourcePacks' | 'shaderPacks') {
    const filePath = await onBrowse('file');
    if (!filePath) return;
    const name = filePath.split(/[\\/]/).pop() ?? filePath;
    const item: InstalledItem = { id: crypto.randomUUID(), name, filePath, enabled: true };
    const update = category === 'mods' ? setMods : category === 'resourcePacks' ? setResourcePacks : setShaderPacks;
    update((items) => [...items, item]);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Give your profile a name to continue.');
      return;
    }
    const existing = initialProfile;
    const id = existing?.id ?? crypto.randomUUID();
    const detectedJava = javaInstallations.find((installation) => installation.path === javaPath.trim());
    onSave({
      id,
      name: name.trim(),
      minecraftVersion: version,
      loader,
      loaderVersion: existing?.loader === loader && !loaders.includes(loader) ? existing.loaderVersion : getLoaderVersion(loader, version),
      javaVersion: detectedJava
        ? `Java ${detectedJava.version}`
        : javaPath.trim() ? 'Custom Java' : 'Auto-detect at launch',
      javaPath: javaPath.trim(),
      microsoftAccountId: accountId || null,
      allocatedRam: ram,
      mods,
      resourcePacks,
      shaderPacks,
      selectedModpack: existing?.selectedModpack ?? null,
      gameDirectory: gameDirectory.trim() || `~/.minecraft/flowclient/${id}`,
      jvmArguments: jvmArguments.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastPlayedAt: existing?.lastPlayedAt ?? null,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <header className="modal-header"><div className="modal-icon"><HardDrive size={19} /></div><div><span className="section-kicker">{isEditing ? 'PROFILE SETTINGS' : 'NEW INSTALLATION'}</span><h2 id="profile-modal-title">{isEditing ? 'Edit profile' : 'Create profile'}</h2></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-section-label"><span>01</span> PROFILE DETAILS</div>
            <label className="form-field"><span>Profile name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cozy survival" maxLength={36} /><small>A name only you see in your library.</small></label>
            <div className="form-row"><label className="form-field"><span>Minecraft version</span><span className="select-wrap"><select value={version} onChange={(event) => { setVersion(event.target.value); if (!getCompatibleLoaders(event.target.value).includes(loader)) setLoader('Vanilla'); }}>{Array.from(new Set([version, ...versions, ...minecraftVersions])).map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={15} /></span></label><label className="form-field"><span>Loader</span><span className="select-wrap"><select value={loader} onChange={(event) => setLoader(event.target.value as Loader)}>{loaderChoices.map((item) => <option key={item} value={item} disabled={!loaders.includes(item)}>{loaders.includes(item) ? item : `${item} (not supported yet)`}</option>)}</select><ChevronDown size={15} /></span></label></div>
            <div className={`compatibility-note ${!loaders.includes(loader) ? 'compatibility-note--warning' : ''}`}>{loaders.includes(loader) ? <Check size={14} /> : <Info size={14} />}<span>{!loaders.includes(loader) ? `${loader} is not supported yet. Select Vanilla or Fabric before launching.` : 'Vanilla is installed from Mojang metadata. Fabric is installed from the official Fabric metadata service.'}</span></div>
            <label className="form-field"><span>Microsoft account</span><span className="select-wrap"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Use active account</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name} · Java Edition verified</option>)}</select><ChevronDown size={15} /></span><small>{accountId ? 'This profile launches with the selected account.' : 'Uses the currently active account from Accounts.'}</small></label>
            <label className="form-field"><span>Game directory</span><div className="form-path"><input value={gameDirectory} onChange={(event) => setGameDirectory(event.target.value)} placeholder="Default profile folder" /><button type="button" title="Browse folder" onClick={async () => { const path = await onBrowse('directory'); if (path) setGameDirectory(path); }}><FolderOpen size={15} /></button></div></label>
            <div className="form-section-label form-section-label--spaced"><span>02</span> PERFORMANCE & JAVA</div>
            <div className="form-field ram-field"><span>Memory allocation <strong>{ram} GB</strong></span><input type="range" min="2" max="16" step="1" value={ram} onChange={(event) => setRam(Number(event.target.value))} /><div className="range-labels"><span>2 GB</span><span>16 GB</span></div></div>
            <label className="form-field"><span>Java executable <small>(optional)</small></span><div className="form-path"><input value={javaPath} onChange={(event) => setJavaPath(event.target.value)} placeholder="Use detected system Java" /><button type="button" title="Browse file" onClick={async () => { const path = await onBrowse('file'); if (path) setJavaPath(path); }}><FolderOpen size={15} /></button></div></label>
            <div className="java-detection-row"><button type="button" className="secondary-button" disabled={detectingJava} onClick={async () => { setDetectingJava(true); setError(''); try { setJavaInstallations(await onDetectJava()); setJavaDetectionComplete(true); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Java detection failed.'); } finally { setDetectingJava(false); } }}>{detectingJava ? 'Detecting Java…' : 'Detect installed Java'}</button>{javaInstallations.length > 0 && <span>{javaInstallations.length} runtime{javaInstallations.length === 1 ? '' : 's'} found</span>}{javaDetectionComplete && javaInstallations.length === 0 && <span>No Java runtime found. Select or install one before playing.</span>}</div>
            {javaInstallations.length > 0 && <label className="form-field"><span>Detected runtimes</span><span className="select-wrap"><select value="" onChange={(event) => { const selected = javaInstallations[Number(event.target.value)]; if (selected) { setJavaPath(selected.path); } }}><option value="">Choose a detected Java</option>{javaInstallations.map((item, index) => <option key={`${item.path}-${item.version}`} value={index}>Java {item.version} · {item.path}</option>)}</select><ChevronDown size={15} /></span></label>}
            <label className="form-field"><span>JVM arguments</span><input value={jvmArguments} onChange={(event) => setJvmArguments(event.target.value)} placeholder="-XX:+UseG1GC" /></label>
            <div className="form-section-label form-section-label--spaced"><span>03</span> PROFILE CONTENT</div>
            <LocalFileList label="Fabric mods" items={mods} onAdd={() => { void addFileItem('mods'); }} onToggle={(id) => setMods((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item))} onRemove={(id) => setMods((items) => items.filter((item) => item.id !== id))} />
            <LocalFileList label="Resource packs" items={resourcePacks} onAdd={() => { void addFileItem('resourcePacks'); }} onToggle={(id) => setResourcePacks((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item))} onRemove={(id) => setResourcePacks((items) => items.filter((item) => item.id !== id))} />
            <LocalFileList label="Shader packs" items={shaderPacks} onAdd={() => { void addFileItem('shaderPacks'); }} onToggle={(id) => setShaderPacks((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item))} onRemove={(id) => setShaderPacks((items) => items.filter((item) => item.id !== id))} />
            <div className="form-info"><Info size={14} /><span>Each profile uses its own game directory. Minecraft files are installed when you press PLAY.</span></div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <footer className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> {isEditing ? 'Save changes' : 'Create profile'}</button></footer>
        </form>
      </section>
    </div>
  );
}

function LocalFileList({ label, items, onAdd, onToggle, onRemove }: {
  label: string;
  items: InstalledItem[];
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="local-file-list">
      <div className="local-file-list-heading"><span>{label}</span><button type="button" className="secondary-button" onClick={onAdd}>Add local file</button></div>
      {items.length > 0 ? items.map((item) => <div className="local-file-row" key={item.id}><label><input type="checkbox" checked={item.enabled} onChange={() => onToggle(item.id)} /><span title={item.filePath}>{item.name}</span></label><button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>Remove</button></div>) : <small>No local files added.</small>}
    </section>
  );
}
