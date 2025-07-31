import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, Save, Plus, Settings, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileSectionProps {
  profiles: any[];
  activeProfile: any;
  profilesLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges?: boolean;
  onProfileLoad: (versionId: string) => void;
  onProfileSave: () => void;
  onOpenSaveDialog: () => void;
  onOpenProfileDialog: () => void;
}

export const ProfileSection = React.memo<ProfileSectionProps>(({
  profiles,
  activeProfile,
  profilesLoading,
  isSaving,
  hasUnsavedChanges = false,
  onProfileLoad,
  onProfileSave,
  onOpenSaveDialog,
  onOpenProfileDialog
}) => {
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs gap-1 max-w-[200px]"
            disabled={profilesLoading}
          >
            <span className="truncate">
              {activeProfile?.name || 'Select Profile'}
            </span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Profiles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {profiles.map((profile) => (
            <DropdownMenuItem
              key={profile.versionId}
              onClick={() => onProfileLoad(profile.versionId)}
              className={profile.versionId === activeProfile?.versionId ? 'bg-accent' : ''}
            >
              {profile.name}
            </DropdownMenuItem>
          ))}
          {profiles.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No profiles available
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSaveDialog}>
            <Plus className="h-3 w-3 mr-2" />
            Create New Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenProfileDialog}>
            <Settings className="h-3 w-3 mr-2" />
            Manage Profiles
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Save button - smaller */}
      <Button
        onClick={onProfileSave}
        disabled={isSaving || !activeProfile}
        variant={hasUnsavedChanges ? "default" : "ghost"}
        size="sm"
        className={`h-8 w-8 p-0 ${hasUnsavedChanges ? 'animate-pulse' : ''}`}
        title={hasUnsavedChanges ? 'Save unsaved changes' : 'Save current profile'}
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Save className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
});