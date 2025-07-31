import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, ChevronRight, RotateCcw, Search } from 'lucide-react';
import {
  DraggableDialog,
  DraggableDialogContent,
  DraggableDialogDescription,
  DraggableDialogFooter,
  DraggableDialogHeader,
  DraggableDialogTitle,
  DraggableDialogBody,
} from '@/components/ui/draggable-dialog';
import {
  GRID_OPTIONS_CATEGORIES,
  GridOptionDefinition,
  GridOptionsCategory,
  getDefaultGridOptions
} from '../config/gridOptions';

interface GridOptionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOptions: Record<string, any>;
  onApply: (options: Record<string, any>) => void;
}

interface CategorySectionProps {
  category: GridOptionsCategory;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset: (category: string) => void;
  expandedCategories: Set<string>;
  toggleCategory: (category: string) => void;
  searchTerm: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  values,
  onChange,
  onReset,
  expandedCategories,
  toggleCategory,
  searchTerm
}) => {
  const isExpanded = expandedCategories.has(category.name);
  
  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return category.options;
    
    const lowerSearch = searchTerm.toLowerCase();
    return category.options.filter(option => 
      option.label.toLowerCase().includes(lowerSearch) ||
      option.description.toLowerCase().includes(lowerSearch) ||
      option.key.toLowerCase().includes(lowerSearch)
    );
  }, [category.options, searchTerm]);
  
  // Don't render category if no options match search
  if (searchTerm && filteredOptions.length === 0) {
    return null;
  }
  
  const renderOption = (option: GridOptionDefinition) => {
    const value = values[option.key] ?? option.defaultValue;
    
    switch (option.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between py-2">
            <Label htmlFor={option.key} className="flex flex-col space-y-1 cursor-pointer">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
            <Switch
              id={option.key}
              checked={value}
              onCheckedChange={(checked) => onChange(option.key, checked)}
            />
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2 py-2">
            <Label htmlFor={option.key} className="flex flex-col space-y-1">
              <span className="font-medium">{option.label}: {value}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
            {option.min !== undefined && option.max !== undefined ? (
              <Slider
                id={option.key}
                min={option.min}
                max={option.max}
                step={option.step || 1}
                value={[value]}
                onValueChange={([val]) => onChange(option.key, val)}
                className="w-full"
              />
            ) : (
              <Input
                id={option.key}
                type="number"
                value={value}
                onChange={(e) => onChange(option.key, Number(e.target.value))}
                className="w-full"
              />
            )}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2 py-2">
            <Label htmlFor={option.key} className="flex flex-col space-y-1">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
            <Select value={value || ''} onValueChange={(val) => onChange(option.key, val)}>
              <SelectTrigger id={option.key}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {option.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      default:
        return (
          <div className="space-y-2 py-2">
            <Label htmlFor={option.key} className="flex flex-col space-y-1">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
            <Input
              id={option.key}
              type="text"
              value={value}
              onChange={(e) => onChange(option.key, e.target.value)}
              className="w-full"
            />
          </div>
        );
    }
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
        onClick={() => toggleCategory(category.name)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">{category.label}</span>
          {searchTerm && (
            <span className="text-xs text-muted-foreground">
              ({filteredOptions.length} matches)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onReset(category.name);
          }}
          className="h-6 px-2 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </button>
      
      {isExpanded && (
        <div className="px-4 py-2 space-y-1">
          {category.description && (
            <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
          )}
          {filteredOptions.map(option => (
            <div key={option.key} className="border-b last:border-0">
              {renderOption(option)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Extracted content component for reuse
export const GridOptionsEditorContent: React.FC<{
  currentOptions: Record<string, any>;
  onApply: (options: Record<string, any>) => void;
  onClose: () => void;
}> = ({ currentOptions, onApply, onClose }) => {
  const [values, setValues] = useState<Record<string, any>>(currentOptions);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['display']) // Display category expanded by default
  );
  
  // Initialize values from currentOptions
  useEffect(() => {
    setValues(currentOptions);
  }, [currentOptions]);
  
  const handleChange = useCallback((key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleApply = useCallback(() => {
    onApply(values);
  }, [values, onApply]);
  
  const handleResetAll = useCallback(() => {
    const defaults = getDefaultGridOptions();
    setValues(defaults);
  }, []);
  
  const handleResetCategory = useCallback((categoryName: string) => {
    const category = GRID_OPTIONS_CATEGORIES.find(c => c.name === categoryName);
    if (!category) return;
    
    const updates: Record<string, any> = {};
    category.options.forEach(option => {
      updates[option.key] = option.defaultValue;
    });
    
    setValues(prev => ({ ...prev, ...updates }));
  }, []);
  
  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }, []);
  
  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(GRID_OPTIONS_CATEGORIES.map(c => c.name)));
  }, []);
  
  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);
  
  // Count changed options
  const changedCount = useMemo(() => {
    const defaults = getDefaultGridOptions();
    return Object.keys(values).filter(key => values[key] !== defaults[key]).length;
  }, [values]);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Grid Options</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure AG-Grid display and behavior options. Changes will be saved to your current profile.
        </p>
      </div>
      
      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Expand/Collapse controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
              {changedCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {changedCount} option{changedCount !== 1 ? 's' : ''} changed
                </span>
              )}
            </div>
            
            {/* Categories */}
            <div className="space-y-3">
              {GRID_OPTIONS_CATEGORIES.map(category => (
                <CategorySection
                  key={category.name}
                  category={category}
                  values={values}
                  onChange={handleChange}
                  onReset={handleResetCategory}
                  expandedCategories={expandedCategories}
                  toggleCategory={toggleCategory}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          </div>
      </div>
      
      {/* Footer */}
      <div className="border-t px-6 py-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleResetAll}>
          Reset All to Defaults
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleApply}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
};

// Original component that uses DraggableDialog
export const GridOptionsEditor: React.FC<GridOptionsEditorProps> = ({
  open,
  onOpenChange,
  currentOptions,
  onApply
}) => {
  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="max-w-3xl max-h-[90vh]">
        <GridOptionsEditorContent
          currentOptions={currentOptions}
          onApply={onApply}
          onClose={() => onOpenChange(false)}
        />
      </DraggableDialogContent>
    </DraggableDialog>
  );
};