import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  DraggableDialog,
  DraggableDialogContent,
  DraggableDialogDescription,
  DraggableDialogFooter,
  DraggableDialogHeader,
  DraggableDialogTitle,
  DraggableDialogBody,
} from '@/components/ui/draggable-dialog';

interface GridCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (settings: GridCustomizationSettings) => void;
  currentSettings?: GridCustomizationSettings;
}

export interface GridCustomizationSettings {
  display: {
    enableCellFlash: boolean;
    animateRows: boolean;
    rowBuffer: number;
    asyncTransactionWaitMillis: number;
  };
  columns: {
    autoSizeColumns: boolean;
    resizableColumns: boolean;
    sortableColumns: boolean;
  };
  performance: {
    enableRangeSelection: boolean;
    enableClipboard: boolean;
    suppressRowHoverHighlight: boolean;
    suppressCellFocus: boolean;
  };
  export: {
    includeHeaders: boolean;
    onlySelected: boolean;
    allColumns: boolean;
  };
}

const defaultSettings: GridCustomizationSettings = {
  display: {
    enableCellFlash: true,
    animateRows: true,
    rowBuffer: 10,
    asyncTransactionWaitMillis: 50,
  },
  columns: {
    autoSizeColumns: false,
    resizableColumns: true,
    sortableColumns: true,
  },
  performance: {
    enableRangeSelection: true,
    enableClipboard: true,
    suppressRowHoverHighlight: false,
    suppressCellFocus: false,
  },
  export: {
    includeHeaders: true,
    onlySelected: false,
    allColumns: true,
  },
};

export const GridCustomizationDialog: React.FC<GridCustomizationDialogProps> = ({
  open,
  onOpenChange,
  onApply,
  currentSettings = defaultSettings,
}) => {
  const [settings, setSettings] = useState<GridCustomizationSettings>(currentSettings);

  const handleApply = () => {
    onApply(settings);
    onOpenChange(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="max-w-2xl">
        <DraggableDialogHeader>
          <DraggableDialogTitle>Grid Customization</DraggableDialogTitle>
          <DraggableDialogDescription>
            Fine-tune your data grid appearance and behavior
          </DraggableDialogDescription>
        </DraggableDialogHeader>
        
        <DraggableDialogBody className="min-h-[400px] max-h-[600px]">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="display">Display</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>
            
            <TabsContent value="display" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cell-flash" className="flex flex-col space-y-1">
                    <span>Enable Cell Flash</span>
                    <span className="text-sm text-muted-foreground">
                      Flash cells when data changes
                    </span>
                  </Label>
                  <Switch
                    id="cell-flash"
                    checked={settings.display.enableCellFlash}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        display: { ...settings.display, enableCellFlash: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="animate-rows" className="flex flex-col space-y-1">
                    <span>Animate Rows</span>
                    <span className="text-sm text-muted-foreground">
                      Animate row movements
                    </span>
                  </Label>
                  <Switch
                    id="animate-rows"
                    checked={settings.display.animateRows}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        display: { ...settings.display, animateRows: checked },
                      })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="row-buffer" className="flex flex-col space-y-1">
                    <span>Row Buffer Size: {settings.display.rowBuffer}</span>
                    <span className="text-sm text-muted-foreground">
                      Number of rows to render outside viewport
                    </span>
                  </Label>
                  <Slider
                    id="row-buffer"
                    min={0}
                    max={50}
                    step={5}
                    value={[settings.display.rowBuffer]}
                    onValueChange={([value]) =>
                      setSettings({
                        ...settings,
                        display: { ...settings.display, rowBuffer: value },
                      })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="async-wait" className="flex flex-col space-y-1">
                    <span>Async Transaction Wait: {settings.display.asyncTransactionWaitMillis}ms</span>
                    <span className="text-sm text-muted-foreground">
                      Delay for batching updates
                    </span>
                  </Label>
                  <Slider
                    id="async-wait"
                    min={0}
                    max={500}
                    step={50}
                    value={[settings.display.asyncTransactionWaitMillis]}
                    onValueChange={([value]) =>
                      setSettings({
                        ...settings,
                        display: { ...settings.display, asyncTransactionWaitMillis: value },
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="columns" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-size" className="flex flex-col space-y-1">
                    <span>Auto Size Columns</span>
                    <span className="text-sm text-muted-foreground">
                      Automatically adjust column widths
                    </span>
                  </Label>
                  <Switch
                    id="auto-size"
                    checked={settings.columns.autoSizeColumns}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        columns: { ...settings.columns, autoSizeColumns: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="resizable" className="flex flex-col space-y-1">
                    <span>Resizable Columns</span>
                    <span className="text-sm text-muted-foreground">
                      Allow column resizing
                    </span>
                  </Label>
                  <Switch
                    id="resizable"
                    checked={settings.columns.resizableColumns}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        columns: { ...settings.columns, resizableColumns: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="sortable" className="flex flex-col space-y-1">
                    <span>Sortable Columns</span>
                    <span className="text-sm text-muted-foreground">
                      Enable column sorting
                    </span>
                  </Label>
                  <Switch
                    id="sortable"
                    checked={settings.columns.sortableColumns}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        columns: { ...settings.columns, sortableColumns: checked },
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="range-selection" className="flex flex-col space-y-1">
                    <span>Enable Range Selection</span>
                    <span className="text-sm text-muted-foreground">
                      Allow selecting cell ranges
                    </span>
                  </Label>
                  <Switch
                    id="range-selection"
                    checked={settings.performance.enableRangeSelection}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        performance: { ...settings.performance, enableRangeSelection: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="clipboard" className="flex flex-col space-y-1">
                    <span>Enable Clipboard</span>
                    <span className="text-sm text-muted-foreground">
                      Allow copy/paste operations
                    </span>
                  </Label>
                  <Switch
                    id="clipboard"
                    checked={settings.performance.enableClipboard}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        performance: { ...settings.performance, enableClipboard: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="suppress-hover" className="flex flex-col space-y-1">
                    <span>Suppress Row Hover</span>
                    <span className="text-sm text-muted-foreground">
                      Disable row hover highlight
                    </span>
                  </Label>
                  <Switch
                    id="suppress-hover"
                    checked={settings.performance.suppressRowHoverHighlight}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        performance: { ...settings.performance, suppressRowHoverHighlight: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="suppress-focus" className="flex flex-col space-y-1">
                    <span>Suppress Cell Focus</span>
                    <span className="text-sm text-muted-foreground">
                      Disable cell focus indicator
                    </span>
                  </Label>
                  <Switch
                    id="suppress-focus"
                    checked={settings.performance.suppressCellFocus}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        performance: { ...settings.performance, suppressCellFocus: checked },
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="export" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-headers" className="flex flex-col space-y-1">
                    <span>Include Headers</span>
                    <span className="text-sm text-muted-foreground">
                      Include column headers in export
                    </span>
                  </Label>
                  <Switch
                    id="include-headers"
                    checked={settings.export.includeHeaders}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        export: { ...settings.export, includeHeaders: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="only-selected" className="flex flex-col space-y-1">
                    <span>Only Selected Rows</span>
                    <span className="text-sm text-muted-foreground">
                      Export only selected rows
                    </span>
                  </Label>
                  <Switch
                    id="only-selected"
                    checked={settings.export.onlySelected}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        export: { ...settings.export, onlySelected: checked },
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="all-columns" className="flex flex-col space-y-1">
                    <span>All Columns</span>
                    <span className="text-sm text-muted-foreground">
                      Export all columns including hidden
                    </span>
                  </Label>
                  <Switch
                    id="all-columns"
                    checked={settings.export.allColumns}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        export: { ...settings.export, allColumns: checked },
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DraggableDialogBody>
        
        <DraggableDialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Changes
          </Button>
        </DraggableDialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  );
};