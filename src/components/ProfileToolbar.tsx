import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, SaveAll, Settings2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileToolbarProps {
  onSave: () => void;
  onSaveAs: () => void;
  onManage: () => void;
  isSaving?: boolean;
  lastSaved?: Date;
  disabled?: boolean;
  className?: string;
}

export function ProfileToolbar({
  onSave,
  onSaveAs,
  onManage,
  isSaving = false,
  lastSaved,
  disabled = false,
  className = ''
}: ProfileToolbarProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={disabled || isSaving}
        className="gap-2"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onSaveAs}
        disabled={disabled || isSaving}
        className="gap-2"
      >
        <SaveAll className="h-4 w-4" />
        Save As...
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onManage}
        disabled={disabled}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        Manage
      </Button>

      {lastSaved && (
        <span className="text-xs text-muted-foreground ml-2">
          Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
        </span>
      )}
    </div>
  );
}