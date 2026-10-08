const avatarSkins: Record<string, string> = {
  moss: '#9ba867',
  ember: '#c97857',
  ocean: '#639bb3',
  violet: '#9a81bb',
  gold: '#d0a64f',
};

export function PixelAvatar({ preset = 'moss', name, size = 'medium' }: { preset?: string; name: string; size?: 'small' | 'medium' | 'large' }) {
  const color = avatarSkins[preset] ?? avatarSkins.moss;
  return (
    <div className={`pixel-avatar pixel-avatar--${size}`} style={{ '--avatar-color': color } as React.CSSProperties} aria-label={`${name} avatar`}>
      <span className="avatar-hair" />
      <span className="avatar-eye avatar-eye--left" />
      <span className="avatar-eye avatar-eye--right" />
      <span className="avatar-mouth" />
    </div>
  );
}

export const avatarPresets = Object.keys(avatarSkins);
