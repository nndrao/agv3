import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Plus, Sparkles, FileText, Save } from 'lucide-react';
import { GridConditionalFormattingStorage } from './gridConditionalFormattingStorage';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { ColDef } from 'ag-grid-community';
import { RuleList } from '@/components/conditional-formatting/components/RuleList';
import { RuleEditorSimplified } from './RuleEditorSimplified';
import { RuleTemplates } from '@/components/conditional-formatting/components/RuleTemplates';
import { createNewRule, duplicateRule, moveRule, createRuleFromTemplate } from '@/components/conditional-formatting/utils/ruleUtils';
import { ConditionalRuleTemplate } from '@/components/conditional-formatting/types';
import './conditionalFormatting.css';

interface ConditionalFormattingEditorContentProps {
  columnDefs: ColDef[];
  currentRules?: ConditionalRule[]; // All available rules
  selectedRuleIds?: string[]; // Currently selected rule IDs
  onApply: (selectedRuleIds: string[], allRules: ConditionalRule[]) => void; // Updated signature
  onClose: () => void;
  profileName?: string;
  gridInstanceId?: string; // Required for saving rules to grid storage
}

export const ConditionalFormattingEditorContent: React.FC<ConditionalFormattingEditorContentProps> = ({
  columnDefs,
  currentRules = [],
  selectedRuleIds = [],
  onApply,
  onClose,
  profileName,
  gridInstanceId,
}) => {
  const [rules, setRules] = useState<ConditionalRule[]>(currentRules);
  const [activeRuleIds, setActiveRuleIds] = useState<string[]>(selectedRuleIds); // Track which rules are selected/active
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    currentRules.length > 0 ? currentRules[0].id : null
  );
  const [showTemplates, setShowTemplates] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track if rules have been modified
  
  // Convert column defs to the format expected by components - memoize to prevent re-renders
  const availableColumns = React.useMemo(() => 
    columnDefs.map(col => ({
      field: col.field || '',
      headerName: col.headerName,
      type: Array.isArray(col.type) ? col.type[0] : (col.type || 'text')
    })),
    [columnDefs]
  );

  const selectedRule = React.useMemo(
    () => rules.find(r => r.id === selectedRuleId),
    [rules, selectedRuleId]
  );
  

  const handleAddRule = useCallback(() => {
    const newRule = createNewRule();
    setRules(prevRules => [...prevRules, newRule]);
    setSelectedRuleId(newRule.id);
    setShowTemplates(false);
    setHasUnsavedChanges(true);
  }, []);

  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules(prevRules => prevRules.filter(r => r.id !== ruleId));
    
    // Remove from active rules if it was selected
    setActiveRuleIds(prevActiveIds => prevActiveIds.filter(id => id !== ruleId));
    
    setSelectedRuleId(prevSelectedId => {
      if (prevSelectedId === ruleId) {
        // Will select first rule after deletion
        return null;
      }
      return prevSelectedId;
    });
    
    setHasUnsavedChanges(true);
  }, []);

  const handleDuplicateRule = useCallback((ruleId: string) => {
    setRules(prevRules => {
      const rule = prevRules.find(r => r.id === ruleId);
      if (rule) {
        const duplicated = duplicateRule(rule);
        setSelectedRuleId(duplicated.id);
        setHasUnsavedChanges(true);
        return [...prevRules, duplicated];
      }
      return prevRules;
    });
  }, []);

  const handleMoveRule = useCallback((ruleId: string, direction: 'up' | 'down') => {
    setRules(prevRules => moveRule(prevRules, ruleId, direction));
    setHasUnsavedChanges(true);
  }, []);

  const handleToggleRule = useCallback((ruleId: string) => {
    setRules(prevRules => prevRules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    setHasUnsavedChanges(true);
  }, []);

  const handleUpdateRule = useCallback((updatedRule: ConditionalRule) => {
    setRules(prevRules => prevRules.map(r => 
      r.id === updatedRule.id ? updatedRule : r
    ));
    setHasUnsavedChanges(true);
  }, []);

  const handleSelectTemplate = useCallback((template: ConditionalRuleTemplate) => {
    const newRule = createRuleFromTemplate(template);
    setRules(prevRules => [...prevRules, newRule]);
    setSelectedRuleId(newRule.id);
    setShowTemplates(false);
  }, []);

  // Handle checkbox toggle for rule selection
  const handleToggleRuleActive = useCallback((ruleId: string) => {
    setActiveRuleIds(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  }, []);

  const handleApply = useCallback(() => {
    onApply(activeRuleIds, rules);
  }, [activeRuleIds, rules, onApply]);

  const handleSaveRules = useCallback(async () => {
    if (!gridInstanceId) {
      console.warn('[ConditionalFormattingEditor] No gridInstanceId provided, cannot save rules');
      return;
    }

    try {
      // Save all rules to grid-level storage
      rules.forEach(rule => {
        GridConditionalFormattingStorage.saveRule(gridInstanceId, rule);
      });
      
      setHasUnsavedChanges(false);
      console.log(`[ConditionalFormattingEditor] Saved ${rules.length} rules to grid storage`);
      
      // You could add a toast notification here if needed
    } catch (error) {
      console.error('[ConditionalFormattingEditor] Error saving rules:', error);
    }
  }, [rules, gridInstanceId]);

  return (
    <div className="conditional-formatting-dialog">
      {/* Main Content Area with Flex Layout */}
      <div className="cf-content-wrapper">
        {/* Left Panel - Rules List */}
        <div className="cf-sidebar-panel">
          <div className="cf-rules-panel">
            <div className="cf-rules-header">
              <div className="flex gap-3">
                <Button
                  onClick={handleAddRule}
                  size="sm"
                  className="flex-1 min-w-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Rule
                </Button>
                <Button
                  onClick={() => setShowTemplates(!showTemplates)}
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-0"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Templates
                </Button>
              </div>
            </div>
            <div className="cf-rules-list">
              <RuleList
                rules={rules}
                selectedRuleId={selectedRuleId}
                activeRuleIds={activeRuleIds}
                onSelectRule={setSelectedRuleId}
                onDeleteRule={handleDeleteRule}
                onDuplicateRule={handleDuplicateRule}
                onMoveRule={handleMoveRule}
                onToggleRule={handleToggleRule}
                onToggleActive={handleToggleRuleActive}
              />
            </div>
          </div>
        </div>

        {/* Center Panel - Rule Editor or Templates */}
        <div className="cf-main-panel">
          <div className="cf-editor-panel">
            {showTemplates ? (
              <RuleTemplates
                columnType={Array.isArray(columnDefs[0]?.type) ? columnDefs[0].type[0] : columnDefs[0]?.type}
                onSelectTemplate={handleSelectTemplate}
              />
            ) : selectedRule ? (
              <RuleEditorSimplified
                rule={selectedRule}
                availableColumns={availableColumns}
                onUpdateRule={handleUpdateRule}
                columnType={Array.isArray(columnDefs[0]?.type) ? columnDefs[0].type[0] : columnDefs[0]?.type}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-muted-foreground">No rule selected</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Click on any rule in the sidebar to edit it,<br />
                      or create a new rule to get started
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="cf-footer">
        <div className="cf-footer-info">
          {rules.length > 0 ? (
            <span>{rules.filter(r => r.enabled).length} of {rules.length} rules active</span>
          ) : (
            <span>No rules configured</span>
          )}
        </div>
        <div className="cf-footer-actions">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={handleSaveRules}
            variant="outline"
            disabled={!hasUnsavedChanges}
            className="min-w-[120px]"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Rules
          </Button>
          <Button
            onClick={handleApply}
            className="min-w-[100px]"
            variant="default"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};