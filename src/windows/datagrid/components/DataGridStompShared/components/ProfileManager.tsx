import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Save, ChevronDown, Plus, FolderOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileManagementDialog } from '@/components/ProfileManagementDialog';
import { SaveProfileDialog } from '@/components/SaveProfileDialog';
import { DataGridStompSharedProfile } from '../types';

interface ProfileManagerProps {
  // Profile data
  profiles: any[];
  activeProfile: any;
  activeProfileData: DataGridStompSharedProfile | null;
  profilesLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Profile operations
  onProfileLoad: (versionId: string) => Promise<void>;
  onProfileSave: () => Promise<void>;
  onProfileDelete: (versionId: string) => Promise<void>;
  onProfileRename: (versionId: string, newName: string) => Promise<void>;
  onProfileSetDefault: (versionId: string) => Promise<void>;
  onProfileImport: (file: File) => Promise<void>;
  onProfileExport: () => Promise<void>;
  
  // Dialog state
  showProfileDialog: boolean;
  setShowProfileDialog: (show: boolean) => void;
  showSaveDialog: boolean;
  setShowSaveDialog: (show: boolean) => void;
  
  // Save handlers
  onSaveNewProfile: (name: string) => Promise<void>;
  onOpenSaveDialog: () => void;
  onOpenProfileDialog: () => void;
  
  // Operation state
  profileOperation: 'idle' | 'loading' | 'saving';
  profileName: string;
  profileError: string;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfile,
  activeProfileData,
  profilesLoading,
  isSaving,
  hasUnsavedChanges,
  onProfileLoad,
  onProfileSave,
  onProfileDelete,
  onProfileRename,
  onProfileSetDefault,
  onProfileImport,
  onProfileExport,
  showProfileDialog,
  setShowProfileDialog,
  showSaveDialog,
  setShowSaveDialog,
  onSaveNewProfile,
  onOpenSaveDialog,
  onOpenProfileDialog,
  profileOperation,
  profileName,
  profileError
}) => {
  const handleQuickProfileSwitch = useCallback((versionId: string) => {
    if (versionId !== activeProfile?.versionId) {
      onProfileLoad(versionId);
    }
  }, [activeProfile, onProfileLoad]);

  const getStatusColor = () => {
    if (profileOperation === 'loading') return 'text-blue-500';
    if (profileOperation === 'saving') return 'text-green-500';
    if (profileError) return 'text-red-500';
    if (hasUnsavedChanges) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getStatusText = () => {
    if (profileOperation === 'loading') return `Loading ${profileName}...`;
    if (profileOperation === 'saving') return 'Saving...';
    if (profileError) return profileError;
    if (hasUnsavedChanges) return 'Unsaved changes';
    return activeProfile?.name || 'No profile';
  };

  return (
    <>
      {/* Profile Controls */}
      <div className="flex items-center gap-2">
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={profilesLoading}
              className="min-w-[150px] justify-between"
            >
              <span className="truncate">
                {activeProfile?.name || 'Select Profile'}
              </span>
              <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel>Profiles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.versionId}
                onClick={() => handleQuickProfileSwitch(profile.versionId)}
                className={profile.versionId === activeProfile?.versionId ? 'bg-accent' : ''}
              >
                {profile.name}
                {profile.versionId === activeProfile?.versionId && ' ✓'}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSaveDialog}>
              <Plus className="h-3 w-3 mr-2" />
              New Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenProfileDialog}>
              <FolderOpen className="h-3 w-3 mr-2" />
              Manage Profiles
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save Button */}
        <Button
          size="sm"
          variant={hasUnsavedChanges ? "default" : "outline"}
          onClick={onProfileSave}
          disabled={isSaving || !activeProfile}
          title={hasUnsavedChanges ? "Save changes to current profile" : "No changes to save"}
        >
          {isSaving ? (
            <>
              <Save className="h-3 w-3 mr-1 animate-pulse" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" />
              Save
            </>
          )}
        </Button>

        {/* Status Indicator */}
        <span className={`text-xs ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Dialogs */}
      <ProfileManagementDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        profiles={profiles}
        activeProfileId={activeProfile?.versionId}
        onSave={async (profile: any, name: string) => {
          const fullProfile: DataGridStompSharedProfile = {
            ...activeProfileData!,
            ...profile,
            name
          };
          await onProfileSave();
        }}
        onDelete={onProfileDelete}
        onRename={onProfileRename}
        onSetDefault={onProfileSetDefault}
        onImport={onProfileImport}
        onExport={onProfileExport}
      />
      
      <SaveProfileDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={onSaveNewProfile}
        title='Create New Profile'
        initialName=''
      />
    </>
  );
};