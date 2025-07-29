import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RenameViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (newTitle: string) => void;
}

export function RenameViewDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename
}: RenameViewDialogProps) {
  const [newTitle, setNewTitle] = useState(currentTitle);

  useEffect(() => {
    if (open) {
      setNewTitle(currentTitle);
    }
  }, [open, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newTitle !== currentTitle) {
      onRename(newTitle.trim());
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] bg-[#2B2B2B] border-gray-700 p-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="px-5 py-4">
            <DialogTitle className="text-white font-normal text-sm mb-3">Rename Tab</DialogTitle>
            <Input
              id="view-name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-[#3C3C3C] border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-0 text-sm"
              placeholder="Enter tab name"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 bg-[#242424] border-t border-gray-700">
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-gray-700 hover:text-white text-sm px-6 py-1.5 h-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!newTitle.trim() || newTitle.trim() === currentTitle}
              className="bg-[#0E70D1] hover:bg-[#0960B8] text-white text-sm px-6 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}