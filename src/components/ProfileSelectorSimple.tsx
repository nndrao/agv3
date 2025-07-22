import React from 'react';
import { ConfigVersion } from '@/services/storage/types';

interface ProfileSelectorSimpleProps {
  profiles: ConfigVersion[];
  activeProfileId?: string;
  onProfileChange: (versionId: string) => void;
  onCreateProfile?: () => void;
  onManageProfiles?: () => void;
  loading?: boolean;
}

const ProfileSelectorSimpleComponent = ({
  profiles,
  activeProfileId,
  onProfileChange,
  onCreateProfile,
  onManageProfiles,
  loading = false
}: ProfileSelectorSimpleProps) => {
  // console.log('[ProfileSelectorSimple] Rendering with:', {
  //   profilesCount: profiles.length,
  //   profiles: profiles.map(p => ({ id: p.versionId, name: p.name })),
  //   activeProfileId,
  //   loading
  // });

  if (loading) {
    return <div className="text-sm">Loading profiles...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={activeProfileId || ''}
        onChange={(e) => onProfileChange(e.target.value)}
        className="h-9 px-3 py-1 text-sm border rounded-md bg-background"
        disabled={profiles.length === 0}
      >
        <option value="">Select a profile...</option>
        {profiles.map((profile) => (
          <option key={profile.versionId} value={profile.versionId}>
            {profile.name}
          </option>
        ))}
      </select>
      
      {onCreateProfile && (
        <button
          onClick={onCreateProfile}
          className="h-9 px-3 py-1 text-sm border rounded-md hover:bg-accent"
          title="Create new profile"
        >
          +
        </button>
      )}
      
      {onManageProfiles && (
        <button
          onClick={onManageProfiles}
          className="h-9 px-3 py-1 text-sm border rounded-md hover:bg-accent"
          title="Manage profiles"
        >
          ⚙
        </button>
      )}
    </div>
  );
};

export const ProfileSelectorSimple = React.memo(ProfileSelectorSimpleComponent);