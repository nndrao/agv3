import React from 'react';
import { ProfileSection } from './ProfileSection';
import { ConnectionSection } from './ConnectionSection';
import { SettingsSection } from './SettingsSection';
import { ToolbarProps } from '../../types';

export const Toolbar = React.memo<ToolbarProps>(({
  connectionState,
  selectedProviderId,
  onProviderChange,
  onConnect,
  onDisconnect,
  profiles,
  activeProfile,
  profilesLoading,
  isSaving,
  hasUnsavedChanges,
  onProfileLoad,
  onProfileSave,
  onOpenSaveDialog,
  onOpenProfileDialog,
  sidebarVisible,
  onSidebarToggle,
  isDarkMode,
  onThemeToggle,
  onOpenRenameDialog,
  onOpenGridOptions,
  onOpenColumnGroups,
  viewInstanceId
}) => {
  return (
    <div className="h-14 border-b bg-background flex items-center px-4 gap-2">
      {/* Profile management section */}
      <ProfileSection
        profiles={profiles}
        activeProfile={activeProfile}
        profilesLoading={profilesLoading}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onProfileLoad={onProfileLoad}
        onProfileSave={onProfileSave}
        onOpenSaveDialog={onOpenSaveDialog}
        onOpenProfileDialog={onOpenProfileDialog}
      />
      
      <div className="h-6 w-px bg-border" />
      
      {/* Provider selection and connection */}
      <ConnectionSection
        selectedProviderId={selectedProviderId}
        isConnected={connectionState.isConnected}
        onProviderChange={onProviderChange}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
      
      {/* Connection status - now shown in AG-Grid status bar */}
      
      {/* Right side controls */}
      <SettingsSection
        sidebarVisible={sidebarVisible}
        onSidebarToggle={onSidebarToggle}
        isDarkMode={isDarkMode}
        onThemeToggle={onThemeToggle}
        onOpenRenameDialog={onOpenRenameDialog}
        onOpenGridOptions={onOpenGridOptions}
        onOpenColumnGroups={onOpenColumnGroups}
        profiles={profiles}
        activeProfile={activeProfile}
        viewInstanceId={viewInstanceId}
      />
    </div>
  );
});