import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
// Use OpenFin-adapted Select for proper dropdown rendering in OpenFin windows
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/openfin/openfin-select';
import { ExpressionEditor } from '@/components/expression-editor/ExpressionEditor';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { ShadcnFormatOptions } from './components/ShadcnFormatOptions';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

interface RuleEditorSimplifiedProps {
  rule: ConditionalRule;
  availableColumns: Array<{
    field: string;
    headerName?: string;
    type?: string;
  }>;
  onUpdateRule: (rule: ConditionalRule) => void;
  columnType?: string;
}

export const RuleEditorSimplified: React.FC<RuleEditorSimplifiedProps> = ({
  rule,
  availableColumns,
  onUpdateRule,
  columnType
}) => {
  const [localRule, setLocalRule] = useState(rule);
  const [expressionValid, setExpressionValid] = useState(true);

  // Update rule property
  const updateRule = useCallback((updates: Partial<ConditionalRule>) => {
    const updatedRule = { ...localRule, ...updates };
    setLocalRule(updatedRule);
    onUpdateRule(updatedRule);
  }, [localRule, onUpdateRule]);

  // Update formatting
  const updateFormatting = useCallback((key: string, value: any) => {
    updateRule({
      formatting: {
        ...localRule.formatting,
        [key]: value
      }
    });
  }, [localRule, updateRule]);

  // Update style
  const updateStyle = useCallback((styleUpdates: any) => {
    updateRule({
      formatting: {
        ...localRule.formatting,
        style: {
          ...localRule.formatting.style,
          ...styleUpdates
        }
      }
    });
  }, [localRule, updateRule]);

  // Update scope
  const updateScope = useCallback((scopeUpdates: any) => {
    updateRule({
      scope: {
        ...localRule.scope,
        ...scopeUpdates
      }
    });
  }, [localRule, updateRule]);

  // Handle expression change
  const handleExpressionChange = useCallback((expression: string, isValid: boolean) => {
    setExpressionValid(isValid);
    updateRule({ expression });
  }, [updateRule]);

  // Variables for expression editor
  const variables = [
    { name: 'value', value: null, type: 'object' as 'object', description: 'Current cell value' },
    { name: 'row', value: null, type: 'object' as 'object', description: 'Current row data' },
    { name: 'column', value: null, type: 'object' as 'object', description: 'Current column definition' },
    { name: 'rowIndex', value: 0, type: 'number' as 'number', description: 'Row index' },
    { name: 'api', value: null, type: 'object' as 'object', description: 'Grid API' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="px-4 py-3 space-y-3 border-b bg-background">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-2">
            <Input
              id="rule-name"
              value={localRule.name}
              onChange={(e) => updateRule({ name: e.target.value })}
              placeholder="Rule name"
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="rule-priority" className="text-sm">Priority:</Label>
            <Input
              id="rule-priority"
              type="number"
              min="1"
              value={localRule.priority}
              onChange={(e) => updateRule({ priority: parseInt(e.target.value) || 1 })}
              className="w-16"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="rule-enabled"
                checked={localRule.enabled}
                onCheckedChange={(enabled) => updateRule({ enabled })}
              />
              <Label htmlFor="rule-enabled" className="cursor-pointer text-sm">Enabled</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="rule-scope" className="text-sm">Apply to:</Label>
              <Select
                value={localRule.scope.target}
                onValueChange={(value: 'cell' | 'row') => {
                  updateScope({ 
                    target: value,
                    applyToColumns: value === 'row' ? [] : localRule.scope.applyToColumns
                  });
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cell">Cell only</SelectItem>
                  <SelectItem value="row">Entire row</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Input
            value={localRule.description || ''}
            onChange={(e) => updateRule({ description: e.target.value })}
            placeholder="Description (optional)"
            className="w-64"
          />
        </div>
        
        {/* Column Selector for Cell-only rules */}
        {localRule.scope.target === 'cell' && (
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Label htmlFor="column-selector" className="text-sm pt-2">Columns:</Label>
              <div className="flex-1">
                <MultiSelect
                  options={availableColumns.map(col => ({
                    value: col.field,
                    label: col.headerName || col.field
                  }))}
                  selected={localRule.scope.applyToColumns || []}
                  onChange={(columns) => updateScope({ applyToColumns: columns })}
                  placeholder="Select columns to apply this rule..."
                  emptyText="No columns found"
                  className="w-full"
                />
                {(!localRule.scope.applyToColumns || localRule.scope.applyToColumns.length === 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    If no columns are selected, the rule will apply to all columns
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Resizable Split Layout */}
      <ResizablePanelGroup 
        direction="horizontal" 
        className="flex-1"
        id={`rule-editor-panels-${rule.id}`}
      >
        {/* Left Panel - Expression Editor */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="h-full flex flex-col bg-background">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-medium">Condition Expression</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Expression must return true/false
              </p>
            </div>
            
            {/* Expression Editor takes remaining space */}
            <div className="flex-1 overflow-hidden">
              <ExpressionEditor
                mode="conditional"
                initialExpression={localRule.expression}
                availableColumns={availableColumns}
                availableVariables={variables}
                onChange={handleExpressionChange}
                showPreview={true}
                showHistory={false}
                height="100%"
                id={`rule-editor-expression-${rule.id}`}
                disableResize={true}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Shadcn Format Options (320x600px) */}
        <ResizablePanel defaultSize={35} minSize={30} maxSize={45}>
          <div className="h-full p-2 overflow-auto">
            <ShadcnFormatOptions
              rule={localRule}
              onUpdateRule={(updatedRule) => {
                setLocalRule(updatedRule);
                onUpdateRule(updatedRule);
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};