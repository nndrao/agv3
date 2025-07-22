import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigVersion } from '@/services/storage/types';
import { Trash2, Edit2, Download, Upload, Star, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: ConfigVersion[];
  activeProfileId?: string;
  onSave: (profile: ConfigVersion, name: string) => Promise<void>;
  onDelete: (versionId: string) => Promise<void>;
  onRename: (versionId: string, newName: string) => Promise<void>;
  onSetDefault: (versionId: string) => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onExport: (versionId: string) => void;
  onDuplicate?: (versionId: string, newName: string) => Promise<void>;
}

export function ProfileManagementDialog({
  open,
  onOpenChange,
  profiles,
  activeProfileId,
  onDelete,
  onRename,
  onSetDefault,
  onImport,
  onExport,
  onDuplicate
}: ProfileManagementDialogProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  const handleRename = async (versionId: string) => {
    if (renameName.trim()) {
      await onRename(versionId, renameName.trim());
      setRenameId(null);
      setRenameName('');
    }
  };

  const handleDuplicate = async (versionId: string) => {
    if (duplicateName.trim() && onDuplicate) {
      await onDuplicate(versionId, duplicateName.trim());
      setDuplicateId(null);
      setDuplicateName('');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await onImport(file);
      }
    };
    input.click();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Profiles</DialogTitle>
            <DialogDescription>
              Create, edit, and manage your saved profiles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No profiles available
              </div>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.versionId}
                  className={`p-4 rounded-lg border ${
                    profile.versionId === activeProfileId
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {renameId === profile.versionId ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRename(profile.versionId);
                              }
                            }}
                            onBlur={() => {
                              setRenameId(null);
                              setRenameName('');
                            }}
                            autoFocus
                            className="h-8 w-48"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRename(profile.versionId)}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{profile.name}</h4>
                            {profile.versionId === activeProfileId && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                            {profile.isActive && (
                              <Star className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {formatDistanceToNow(new Date(profile.createdTime), { addSuffix: true })}
                            {profile.modifiedTime && (
                              <> • Modified {formatDistanceToNow(new Date(profile.modifiedTime), { addSuffix: true })}</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setRenameId(profile.versionId);
                          setRenameName(profile.name);
                        }}
                        title="Rename profile"
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      {onDuplicate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDuplicateId(profile.versionId);
                            setDuplicateName(`${profile.name} (Copy)`);
                          }}
                          title="Duplicate profile"
                          className="h-8 w-8"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onExport(profile.versionId)}
                        title="Export profile"
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSetDefault(profile.versionId)}
                        disabled={profile.isActive}
                        title="Set as default"
                        className="h-8 w-8"
                      >
                        <Star className={`h-4 w-4 ${profile.isActive ? 'fill-current' : ''}`} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(profile.versionId)}
                        disabled={profiles.length === 1}
                        title="Delete profile"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {duplicateId === profile.versionId && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.target.value)}
                        placeholder="Enter new profile name"
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleDuplicate(profile.versionId)}
                        disabled={!duplicateName.trim()}
                      >
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDuplicateId(null);
                          setDuplicateName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleImport}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Profile
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this profile? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirmId) {
                  await onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}