import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  Eye,
  EyeOff,
  Palette,
  Sparkles,
  FileText,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConditionalRule, ConditionalFormattingDialogProps } from './types';
import { RuleList } from './components/RuleList';
import { RuleEditor } from './components/RuleEditor';
import { RuleTemplates } from './components/RuleTemplates';
import { PreviewPanel } from './components/PreviewPanel';
import { generateRuleId } from './utils/ruleUtils';

export const ConditionalFormattingDialog: React.FC<ConditionalFormattingDialogProps> = ({
  open,
  onOpenChange,
  columnId,
  columnName,
  columnType,
  availableColumns,
  rules: initialRules,
  onApply,
  onCancel
}) => {
  const { toast } = useToast();
  const [rules, setRules] = useState<ConditionalRule[]>(initialRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    initialRules.length > 0 ? initialRules[0].id : null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Get selected rule
  const selectedRule = useMemo(() => 
    rules.find(r => r.id === selectedRuleId),
    [rules, selectedRuleId]
  );

  // Add new rule
  const handleAddRule = useCallback((template?: Partial<ConditionalRule>) => {
    const newRule: ConditionalRule = {
      id: generateRuleId(),
      name: template?.name || `Rule ${rules.length + 1}`,
      description: template?.description || '',
      enabled: true,
      priority: rules.length + 1,
      expression: template?.expression || '',
      formatting: template?.formatting || {
        style: {
          backgroundColor: '#e3f2fd',
          color: '#1976d2'
        }
      },
      scope: template?.scope || {
        target: 'cell'
      }
    };

    setRules([...rules, newRule]);
    setSelectedRuleId(newRule.id);
    setIsDirty(true);
  }, [rules]);

  // Update rule
  const handleUpdateRule = useCallback((updatedRule: ConditionalRule) => {
    setRules(rules.map(r => r.id === updatedRule.id ? updatedRule : r));
    setIsDirty(true);
  }, [rules]);

  // Delete rule
  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
    if (selectedRuleId === ruleId) {
      setSelectedRuleId(rules.length > 1 ? rules[0].id : null);
    }
    setIsDirty(true);
  }, [rules, selectedRuleId]);

  // Duplicate rule
  const handleDuplicateRule = useCallback((ruleId: string) => {
    const ruleToDuplicate = rules.find(r => r.id === ruleId);
    if (ruleToDuplicate) {
      const newRule: ConditionalRule = {
        ...ruleToDuplicate,
        id: generateRuleId(),
        name: `${ruleToDuplicate.name} (Copy)`,
        priority: rules.length + 1
      };
      setRules([...rules, newRule]);
      setSelectedRuleId(newRule.id);
      setIsDirty(true);
    }
  }, [rules]);

  // Move rule up/down (priority)
  const handleMoveRule = useCallback((ruleId: string, direction: 'up' | 'down') => {
    const index = rules.findIndex(r => r.id === ruleId);
    if (index === -1) return;

    const newRules = [...rules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= rules.length) return;

    // Swap priorities
    const tempPriority = newRules[index].priority;
    newRules[index].priority = newRules[targetIndex].priority;
    newRules[targetIndex].priority = tempPriority;

    // Swap positions
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];

    setRules(newRules);
    setIsDirty(true);
  }, [rules]);

  // Toggle rule enabled
  const handleToggleRule = useCallback((ruleId: string) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    setIsDirty(true);
  }, [rules]);

  // Apply changes
  const handleApply = useCallback(() => {
    // Sort rules by priority before applying
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
    onApply(sortedRules);
    setIsDirty(false);
    toast({
      title: "Rules Applied",
      description: `${rules.length} conditional formatting rules have been applied.`
    });
    onOpenChange(false);
  }, [rules, onApply, toast, onOpenChange]);

  // Cancel changes
  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel?.();
        onOpenChange(false);
      }
    } else {
      onCancel?.();
      onOpenChange(false);
    }
  }, [isDirty, onCancel, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[90vw] h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Conditional Formatting
                {columnName && <span className="text-muted-foreground ml-2">- {columnName}</span>}
              </DialogTitle>
              <DialogDescription>
                Create rules to format cells based on their values using expressions
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddRule()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="rules" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-6 flex-shrink-0">
              <TabsTrigger value="rules" className="gap-2">
                <Palette className="h-4 w-4" />
                Rules ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="flex-1 m-0 p-0 min-h-0 data-[state=active]:flex">
              <div className="flex h-full">
                {/* Rules List */}
                <div className="w-80 border-r flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="font-medium text-sm">Formatting Rules</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rules are applied in priority order
                    </p>
                  </div>
                  <ScrollArea className="flex-1">
                    <RuleList
                      rules={rules}
                      selectedRuleId={selectedRuleId}
                      onSelectRule={setSelectedRuleId}
                      onDeleteRule={handleDeleteRule}
                      onDuplicateRule={handleDuplicateRule}
                      onMoveRule={handleMoveRule}
                      onToggleRule={handleToggleRule}
                    />
                  </ScrollArea>
                </div>

                {/* Rule Editor */}
                <div className="flex-1 min-w-0">
                  {selectedRule ? (
                    <RuleEditor
                      rule={selectedRule}
                      availableColumns={availableColumns}
                      onUpdateRule={handleUpdateRule}
                      columnType={columnType}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No rule selected</p>
                        <p className="text-sm mt-2">Select a rule to edit or create a new one</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => handleAddRule()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Rule
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="flex-1 m-0 p-0 min-h-0 overflow-auto">
              <RuleTemplates
                columnType={columnType}
                onSelectTemplate={(template) => {
                  handleAddRule(template.rule);
                  // Switch back to rules tab
                  const tabsTrigger = document.querySelector('[data-state="active"][value="templates"]');
                  const rulesTab = document.querySelector('[value="rules"]');
                  if (tabsTrigger && rulesTab) {
                    (rulesTab as HTMLElement).click();
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0 p-0 min-h-0">
              <PreviewPanel
                rules={rules.filter(r => r.enabled)}
                availableColumns={availableColumns}
                previewData={previewData}
                onDataChange={setPreviewData}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {isDirty && (
                <span className="text-orange-500">
                  • Unsaved changes
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={rules.length === 0}>
                Apply Rules
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};