import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings2, Plus, FileDown, FileUp } from 'lucide-react';
import { ConfigVersion } from '@/services/storage/types';

interface ProfileSelectorProps {
  profiles: ConfigVersion[];
  activeProfileId?: string;
  onProfileChange: (versionId: string) => void;
  onManageProfiles?: () => void;
  onCreateProfile?: () => void;
  onExportProfile?: () => void;
  onImportProfile?: () => void;
  loading?: boolean;
  className?: string;
  hasUnsavedChanges?: boolean;
}

export function ProfileSelector({
  profiles,
  activeProfileId,
  onProfileChange,
  onManageProfiles,
  onCreateProfile,
  onExportProfile,
  onImportProfile,
  loading = false,
  className = '',
  hasUnsavedChanges = false
}: ProfileSelectorProps) {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">Loading profiles...</span>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">No profiles available</span>
        {onCreateProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateProfile}
            className="gap-2"
          >
            <Plus className="h-3 w-3" />
            Create Profile
          </Button>
        )}
      </div>
    );
  }
  
  // Debug log
  console.log('[ProfileSelector] Rendering with profiles:', profiles);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={activeProfileId || ''}
        onValueChange={onProfileChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a profile..." />
        </SelectTrigger>
        <SelectContent>
          {profiles.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No profiles available
            </div>
          ) : (
            profiles.map((profile) => (
              <SelectItem key={profile.versionId} value={profile.versionId}>
                <div className="flex items-center gap-2">
                  <span>{profile.name}</span>
                  {profile.versionId === activeProfileId && (
                    <span className="text-xs text-muted-foreground">(Current)</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Profile action buttons */}
      <div className="flex items-center gap-1">
        {onCreateProfile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateProfile}
            title="Create new profile"
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {onExportProfile && activeProfileId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onExportProfile}
            title="Export current profile"
            className="h-8 w-8"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        )}

        {onImportProfile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onImportProfile}
            title="Import profile"
            className="h-8 w-8"
          >
            <FileUp className="h-4 w-4" />
          </Button>
        )}

        {onManageProfiles && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onManageProfiles}
            title="Manage profiles"
            className="h-8 w-8"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}