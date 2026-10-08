import { ArrowUpRight, Box, Layers2, PackageOpen, Search, Sparkles } from 'lucide-react';
import type { PageId } from '../types';

const libraryCopy: Record<Exclude<PageId, 'home' | 'profiles' | 'accounts' | 'settings'>, { title: string; eyebrow: string; description: string; icon: typeof Box; label: string }> = {
  mods: { title: 'Mods', eyebrow: 'MAKE IT YOURS', description: 'Search compatible community mods and manage them per profile.', icon: Box, label: 'MOD LIBRARY' },
  modpacks: { title: 'Modpacks', eyebrow: 'WORLDS, REIMAGINED', description: 'Discover curated modpacks and create a profile from a compatible release.', icon: PackageOpen, label: 'MODPACK LIBRARY' },
  'resource-packs': { title: 'Resource packs', eyebrow: 'A FRESH PERSPECTIVE', description: 'Find resource packs that match your Minecraft version.', icon: Layers2, label: 'RESOURCE PACK LIBRARY' },
  shaders: { title: 'Shaders', eyebrow: 'LIGHT UP YOUR WORLD', description: 'Explore shaders built for your Minecraft version and loader.', icon: Sparkles, label: 'SHADER LIBRARY' },
};

export function LibraryPage({ page }: { page: Exclude<PageId, 'home' | 'profiles' | 'accounts' | 'settings'> }) {
  const item = libraryCopy[page];
  const Icon = item.icon;
  return <div className="page library-page"><header className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> {item.eyebrow}</div><h1>{item.title}</h1><p>{item.description}</p></div><span className="settings-header-icon"><Icon size={20} /></span></header><section className="library-coming"><div className="library-orbit" aria-hidden="true"><span className="orbit-ring orbit-ring--one" /><span className="orbit-ring orbit-ring--two" /><span className="orbit-core"><Icon size={25} /></span><span className="orbit-satellite"><Search size={15} /></span></div><span className="section-kicker">{item.label} / NEXT PHASE</span><h2>Good things take<br /><span>a little setup.</span></h2><p>Modrinth search and compatible installs are on the way. This library will connect to the official Modrinth API in a later development phase.</p><span className="coming-soon-tag">IN DEVELOPMENT <ArrowUpRight size={13} /></span></section></div>;
}
