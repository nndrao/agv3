import React from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { ConditionalFormattingEditorContent } from './ConditionalFormattingEditorContent';

interface ConditionalFormattingDialogProps {
  columnDefs: Array<{
    field: string;
    headerName?: string;
    type?: string;
  }>;
  currentRules: ConditionalRule[];
  onApply: (rules: ConditionalRule[]) => void;
  onClose: () => void;
  profileName?: string;
}

export const ConditionalFormattingDialog: React.FC<ConditionalFormattingDialogProps> = ({
  columnDefs,
  currentRules,
  onApply,
  onClose,
  profileName
}) => {
  return (
    <ConditionalFormattingEditorContent
      columnDefs={columnDefs.map(col => ({
        field: col.field,
        headerName: col.headerName || col.field,
        type: col.type
      }))}
      currentRules={currentRules}
      onApply={onApply}
      onClose={onClose}
      profileName={profileName}
    />
  );
};