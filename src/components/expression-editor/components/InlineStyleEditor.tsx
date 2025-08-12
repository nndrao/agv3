import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShadcnFormatOptions } from '@/windows/datagrid/components/DataGridStompShared/conditionalFormatting/components/ShadcnFormatOptions';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { generateRuleId } from '@/components/conditional-formatting/utils/ruleUtils';

interface InlineStyleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (styles: React.CSSProperties, ruleId: string) => void;
  position?: { x: number; y: number }; // For future use when positioning at cursor
  initialExpression?: string;
}

export const InlineStyleEditor: React.FC<InlineStyleEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExpression = ''
}) => {
  const [ruleId] = useState(() => generateRuleId());
  const [rule, setRule] = useState<ConditionalRule>({
    id: ruleId,
    name: 'Inline Style Rule',
    expression: initialExpression,
    enabled: true,
    priority: 1,
    scope: {
      target: 'cell',
      applyToColumns: []
    },
    formatting: {
      style: {}
    }
  });

  const handleSave = () => {
    if (rule.formatting.style && Object.keys(rule.formatting.style).length > 0) {
      onSave(rule.formatting.style, ruleId);
    }
    onClose();
  };

  const handleUpdateRule = (updatedRule: ConditionalRule) => {
    setRule(updatedRule);
  };

  // Create a portal to render the dialog at document level
  const dialogContent = (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 h-[700px] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle>Visual Style Editor</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ShadcnFormatOptions
            rule={rule}
            onUpdateRule={handleUpdateRule}
          />
        </div>
        
        <DialogFooter className="px-4 py-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Insert Style
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // If we're in an OpenFin environment, we might need special handling
  // For now, use a standard portal to document.body
  if (typeof document !== 'undefined') {
    return createPortal(dialogContent, document.body);
  }

  return null;
};