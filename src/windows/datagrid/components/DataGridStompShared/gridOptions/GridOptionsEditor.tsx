import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  RotateCcw,
  Check,
  Search,
  Grid3x3,
  SortAsc,
  X
} from 'lucide-react';
import { GridOptionsConfig } from './types';
import { GridOptionsPropertyGrid } from './GridOptionsPropertyGrid';
import { gridOptionsSections, getDefaultGridOptions } from './gridOptionsConfig';
import './styles.css';

interface GridOptionsEditorProps {
  currentOptions?: GridOptionsConfig;
  onApply: (options: GridOptionsConfig) => void;
  onClose: () => void;
  profileName?: string;
}

export const GridOptionsEditorContent: React.FC<GridOptionsEditorProps> = ({
  currentOptions = {},
  onApply,
  onClose,
  profileName
}) => {
  // Local state for editing
  const [localOptions, setLocalOptions] = useState<GridOptionsConfig>(currentOptions);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'categorized' | 'alphabetical'>('categorized');

  // Initialize local options when dialog opens or currentOptions change
  useEffect(() => {
    setLocalOptions(currentOptions);
    setHasChanges(false);
  }, [currentOptions]);

  // Track changes
  useEffect(() => {
    const hasAnyChanges = Object.keys(localOptions).some(
      key => localOptions[key as keyof GridOptionsConfig] !== currentOptions[key as keyof GridOptionsConfig]
    );
    setHasChanges(hasAnyChanges);
  }, [localOptions, currentOptions]);

  // Handle option change
  const handleOptionChange = useCallback((key: keyof GridOptionsConfig, value: any) => {
    setLocalOptions(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Handle apply
  const handleApply = useCallback(() => {
    onApply(localOptions);
  }, [localOptions, onApply]);

  // Handle reset
  const handleReset = useCallback(() => {
    setLocalOptions(currentOptions);
    setHasChanges(false);
  }, [currentOptions]);

  // Handle reset to defaults
  const handleResetToDefaults = useCallback(() => {
    const defaults = getDefaultGridOptions();
    setLocalOptions(defaults);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background grid-options-dialog">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Grid Options</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure AG-Grid display and behavior options. Changes will be saved to your current profile.
        </p>
      </div>
      
      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="flex items-center gap-1 px-2 py-2 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode(viewMode === 'categorized' ? 'alphabetical' : 'categorized')}
            title={viewMode === 'categorized' ? 'Sort alphabetically' : 'Sort by category'}
          >
            {viewMode === 'categorized' ? <SortAsc className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-8 w-8"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Property Grid */}
        <ScrollArea className="flex-1 grid-options-scroll-area">
          <div className="grid-options-property-grid">
            <GridOptionsPropertyGrid
              sections={gridOptionsSections}
              options={localOptions}
              onChange={handleOptionChange}
              profileOptions={currentOptions}
              searchTerm={searchTerm}
              viewMode={viewMode}
            />
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Footer */}
      <div className="px-4 py-3 grid-options-footer">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            {profileName && (
              <Badge variant="secondary" className="text-xs">
                {profileName}
              </Badge>
            )}
            {hasChanges && (
              <Badge variant="default" className="text-xs">
                Modified
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              title="Reset all options to default values"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Defaults
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
              title="Reset to original values"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={!hasChanges}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};