import { getAvatarUrl } from '../services/profileService';

const initialsFrom = ({ fullName, email }) => {
  const source = fullName || email || '';
  const parts = source
    .split(/[\s@.]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'OTB';
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const Avatar = ({ profile, label, size = 'md' }) => {
  const imageUrl = getAvatarUrl(profile?.avatar_path);
  const displayLabel = label || profile?.full_name || profile?.email || 'Member';

  return (
    <span className={`avatar avatar-${size}`} aria-label={displayLabel} title={displayLabel}>
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <span>{initialsFrom({ fullName: profile?.full_name || label, email: profile?.email })}</span>
      )}
    </span>
  );
};

export default Avatar;
