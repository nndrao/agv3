import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
// Use OpenFin-adapted Select for proper dropdown rendering in OpenFin windows
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/openfin/openfin-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { ExpressionEditor } from '@/components/expression-editor/ExpressionEditor';
import { ConditionalRule } from '../types';
import { Palette, Code2, Settings } from 'lucide-react';

interface RuleEditorProps {
  rule: ConditionalRule;
  availableColumns: Array<{
    field: string;
    headerName?: string;
    type?: string;
  }>;
  onUpdateRule: (rule: ConditionalRule) => void;
  columnType?: string;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({
  rule,
  availableColumns,
  onUpdateRule
}) => {
  const [localRule, setLocalRule] = useState(rule);

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
  const handleExpressionChange = useCallback((expression: string, _isValid: boolean) => {
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
      {/* Rule Header */}
      <div className="p-4 border-b">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={localRule.name}
                onChange={(e) => updateRule({ name: e.target.value })}
                placeholder="Enter rule name"
              />
            </div>
            <div>
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                type="number"
                min="1"
                value={localRule.priority}
                onChange={(e) => updateRule({ priority: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="rule-description">Description</Label>
            <Textarea
              id="rule-description"
              value={localRule.description || ''}
              onChange={(e) => updateRule({ description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="rule-enabled"
                checked={localRule.enabled}
                onCheckedChange={(enabled) => updateRule({ enabled })}
              />
              <Label htmlFor="rule-enabled">Rule enabled</Label>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="rule-scope">Apply to:</Label>
                <Select
                  value={localRule.scope.target}
                  onValueChange={(value: 'cell' | 'row') => updateScope({ target: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cell">Cell only</SelectItem>
                    <SelectItem value="row">Entire row</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rule Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="expression" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="expression" className="gap-2">
              <Code2 className="h-4 w-4" />
              Condition Expression
            </TabsTrigger>
            <TabsTrigger value="formatting" className="gap-2">
              <Palette className="h-4 w-4" />
              Formatting
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expression" className="flex-1 m-0 p-0 min-h-0">
            <div className="h-full flex flex-col">
              <div className="p-4 bg-muted/50 border-b">
                <p className="text-sm text-muted-foreground">
                  Write an expression that returns <code className="bg-background px-1 py-0.5 rounded">true</code> or <code className="bg-background px-1 py-0.5 rounded">false</code>.
                  The rule will apply when the expression evaluates to <code className="bg-background px-1 py-0.5 rounded">true</code>.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <ExpressionEditor
                  mode="conditional"
                  initialExpression={localRule.expression}
                  availableColumns={availableColumns.map(col => ({
                    field: col.field,
                    headerName: col.headerName || col.field,
                    type: col.type || 'string'
                  }))}
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
          </TabsContent>

          <TabsContent value="formatting" className="flex-1 m-0 overflow-auto">
            <div className="p-4 space-y-6">
              {/* Style Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cell Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Background Color</Label>
                      <ColorPicker
                        color={localRule.formatting.style?.backgroundColor || '#e3f2fd'}
                        onChange={(color) => updateStyle({ backgroundColor: color })}
                      />
                    </div>
                    <div>
                      <Label>Text Color</Label>
                      <ColorPicker
                        color={localRule.formatting.style?.color || '#1976d2'}
                        onChange={(color) => updateStyle({ color })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Font Weight</Label>
                      <Select
                        value={localRule.formatting.style?.fontWeight?.toString() || 'normal'}
                        onValueChange={(value) => updateStyle({ fontWeight: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="lighter">Lighter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Font Style</Label>
                      <Select
                        value={localRule.formatting.style?.fontStyle || 'normal'}
                        onValueChange={(value) => updateStyle({ fontStyle: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="italic">Italic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Text Decoration</Label>
                      <Select
                        value={String(localRule.formatting.style?.textDecoration || 'none')}
                        onValueChange={(value) => updateStyle({ textDecoration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="underline">Underline</SelectItem>
                          <SelectItem value="line-through">Strikethrough</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Border</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="1px solid #ccc"
                        value={localRule.formatting.style?.border || ''}
                        onChange={(e) => updateStyle({ border: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Icon Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Icon Badge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-icon"
                      checked={!!localRule.formatting.icon}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormatting('icon', {
                            name: 'star',
                            position: 'start',
                            color: '#ffa500'
                          });
                        } else {
                          updateFormatting('icon', null);
                        }
                      }}
                    />
                    <Label htmlFor="show-icon">Show icon</Label>
                  </div>

                  {localRule.formatting.icon && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Icon</Label>
                        <IconPicker
                          value={localRule.formatting.icon.name}
                          onChange={(name) => updateFormatting('icon', {
                            ...localRule.formatting.icon,
                            name
                          })}
                        />
                      </div>
                      <div>
                        <Label>Position</Label>
                        <Select
                          value={localRule.formatting.icon.position}
                          onValueChange={(position) => updateFormatting('icon', {
                            ...localRule.formatting.icon,
                            position
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">Start</SelectItem>
                            <SelectItem value="end">End</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Color</Label>
                        <ColorPicker
                          color={localRule.formatting.icon.color || '#000000'}
                          onChange={(color) => updateFormatting('icon', {
                            ...localRule.formatting.icon,
                            color
                          })}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CSS Class */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CSS Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="custom-class another-class"
                    value={Array.isArray(localRule.formatting.cellClass) 
                      ? localRule.formatting.cellClass.join(' ')
                      : localRule.formatting.cellClass || ''
                    }
                    onChange={(e) => updateFormatting('cellClass', e.target.value.split(' ').filter(Boolean))}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Space-separated CSS class names to apply to the cell
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="flex-1 m-0 overflow-auto">
            <div className="p-4 space-y-6">
              {/* Row Scope Options */}
              {localRule.scope.target === 'row' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Row Formatting Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="highlight-entire-row"
                        checked={localRule.scope.highlightEntireRow || false}
                        onCheckedChange={(checked) => updateScope({ highlightEntireRow: checked })}
                      />
                      <Label htmlFor="highlight-entire-row">Highlight entire row</Label>
                    </div>
                    
                    <div>
                      <Label>Apply to specific columns (optional)</Label>
                      <Select
                        value={localRule.scope.applyToColumns?.join(',') || 'all'}
                        onValueChange={(value) => {
                          if (value === 'all') {
                            updateScope({ applyToColumns: undefined });
                          } else {
                            // This would need a multi-select component
                            // For now, just demonstrating the concept
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All columns</SelectItem>
                          <SelectItem value="custom">Select columns...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Value Transform */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Value Transform</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enable-transform"
                      checked={!!localRule.formatting.valueTransform}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormatting('valueTransform', {
                            type: 'prefix',
                            value: ''
                          });
                        } else {
                          updateFormatting('valueTransform', null);
                        }
                      }}
                    />
                    <Label htmlFor="enable-transform">Transform cell value</Label>
                  </div>

                  {localRule.formatting.valueTransform && (
                    <div className="space-y-4">
                      <div>
                        <Label>Transform Type</Label>
                        <Select
                          value={localRule.formatting.valueTransform.type}
                          onValueChange={(type) => updateFormatting('valueTransform', {
                            ...localRule.formatting.valueTransform,
                            type
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prefix">Add Prefix</SelectItem>
                            <SelectItem value="suffix">Add Suffix</SelectItem>
                            <SelectItem value="replace">Replace Value</SelectItem>
                            <SelectItem value="custom">Custom Function</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {localRule.formatting.valueTransform.type !== 'custom' && (
                        <div>
                          <Label>Value</Label>
                          <Input
                            placeholder={
                              localRule.formatting.valueTransform.type === 'prefix' ? 'Prefix text' :
                              localRule.formatting.valueTransform.type === 'suffix' ? 'Suffix text' :
                              'Replacement text'
                            }
                            value={localRule.formatting.valueTransform.value || ''}
                            onChange={(e) => updateFormatting('valueTransform', {
                              ...localRule.formatting.valueTransform,
                              value: e.target.value
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};