import React from 'react';
import { ProfileManagementDialog } from '@/components/ProfileManagementDialog';
import { SaveProfileDialog } from '@/components/SaveProfileDialog';
import { RenameViewDialog } from '@/components/RenameViewDialog';
import { ExpressionEditorDialogControlled } from '@/components/expression-editor/ExpressionEditorDialogControlled';
import { DataGridStompSharedProfile } from '../types';

interface DialogsContainerProps {
  // Profile dialogs
  showProfileDialog: boolean;
  setShowProfileDialog: (show: boolean) => void;
  showSaveDialog: boolean;
  setShowSaveDialog: (show: boolean) => void;
  profiles: any[];
  activeProfile: any;
  activeProfileData: DataGridStompSharedProfile | null;
  
  // Profile operations
  saveProfile: (profile: DataGridStompSharedProfile, saveAsNew?: boolean, name?: string) => Promise<void>;
  deleteProfile: (versionId: string) => Promise<void>;
  handleProfileRename: (versionId: string, newName: string) => Promise<void>;
  handleSetDefault: (versionId: string) => Promise<void>;
  handleProfileImport: (file: File) => Promise<void>;
  handleProfileExport: () => Promise<void>;
  handleSaveNewProfile: (name: string) => Promise<void>;
  
  // Rename dialog
  showRenameDialog: boolean;
  setShowRenameDialog: (show: boolean) => void;
  currentViewTitle: string;
  handleRenameView: (newTitle: string) => Promise<void>;
  
  // Expression editor
  showExpressionEditor: boolean;
  setShowExpressionEditor: (show: boolean) => void;
  baseColumnDefs: any[];
  handleExpressionSave: (expression: string, validation: any) => void;
}

/**
 * DialogsContainer - Centralizes all dialog components
 * Extracted from DataGridStompShared to reduce component complexity
 */
export const DialogsContainer: React.FC<DialogsContainerProps> = ({
  showProfileDialog,
  setShowProfileDialog,
  showSaveDialog,
  setShowSaveDialog,
  profiles,
  activeProfile,
  activeProfileData,
  saveProfile,
  deleteProfile,
  handleProfileRename,
  handleSetDefault,
  handleProfileImport,
  handleProfileExport,
  handleSaveNewProfile,
  showRenameDialog,
  setShowRenameDialog,
  currentViewTitle,
  handleRenameView,
  showExpressionEditor,
  setShowExpressionEditor,
  baseColumnDefs,
  handleExpressionSave
}) => {
  return (
    <>
      {/* Profile Management Dialog */}
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
          await saveProfile(fullProfile, false, name);
        }}
        onDelete={deleteProfile}
        onRename={handleProfileRename}
        onSetDefault={handleSetDefault}
        onImport={handleProfileImport}
        onExport={handleProfileExport}
      />
      
      {/* Save Profile Dialog */}
      <SaveProfileDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveNewProfile}
        title='Create New Profile'
        initialName=''
      />
      
      {/* Rename View Dialog */}
      <RenameViewDialog
        open={showRenameDialog}
        onOpenChange={(open) => {
          setShowRenameDialog(open);
          // If closing and called from context menu, resolve with cancel
          if (!open && (window as any).__renameDialogResolve) {
            (window as any).__renameDialogResolve({ success: false });
            delete (window as any).__renameDialogResolve;
          }
        }}
        currentTitle={currentViewTitle}
        onRename={handleRenameView}
      />
      
      {/* Expression Editor Dialog */}
      <ExpressionEditorDialogControlled 
        open={showExpressionEditor}
        onOpenChange={setShowExpressionEditor}
        mode="conditional"
        availableColumns={baseColumnDefs || []}
        onSave={handleExpressionSave}
      />
    </>
  );
};