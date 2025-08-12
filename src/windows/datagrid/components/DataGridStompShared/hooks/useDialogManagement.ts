import { useState, useCallback, useMemo } from 'react';
import { dialogService } from '@/services/openfin/OpenFinDialogService';
import { useToast } from '@/hooks/use-toast';
import { ConditionalRule } from '@/components/conditional-formatting/types';

interface DialogManagementProps {
  viewInstanceId: string;
  activeProfileName?: string;
  columnDefs: any[];
  unsavedGridOptions: Record<string, any> | null;
  unsavedColumnGroups: any[] | null;
  currentGridOptions: Record<string, any>;
  currentColumnGroups?: any[];
  conditionalFormattingRules: ConditionalRule[];
  onApplyGridOptions: (options: Record<string, any>) => void;
  onApplyColumnGroups: (groups: any[]) => void;
  onApplyConditionalFormatting: (rules: ConditionalRule[]) => void;
}

export function useDialogManagement({
  viewInstanceId,
  activeProfileName,
  columnDefs,
  unsavedGridOptions,
  unsavedColumnGroups,
  currentGridOptions,
  currentColumnGroups,
  conditionalFormattingRules,
  onApplyGridOptions,
  onApplyColumnGroups,
  onApplyConditionalFormatting
}: DialogManagementProps) {
  const { toast } = useToast();
  
  // Dialog visibility state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);
  
  // Window options for dialogs
  const windowOptions = useMemo(() => ({
    defaultWidth: 800,
    defaultHeight: 700,
    defaultCentered: true,
    frame: true,
    resizable: true,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: false,
    saveWindowState: false,
    autoShow: true
  }), []);
  
  // Open Grid Options dialog
  const handleOpenGridOptions = useCallback(async () => {
    const currentOptions = unsavedGridOptions || currentGridOptions;
    
    await dialogService.openDialog({
      name: `grid-options-${viewInstanceId}`,
      route: '/grid-options',
      data: {
        options: currentOptions,
        profileName: activeProfileName
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 900,
        defaultHeight: 700
      },
      onApply: (data) => {
        if (data?.options) {
          onApplyGridOptions(data.options);
        }
      }
    });
  }, [unsavedGridOptions, currentGridOptions, activeProfileName, viewInstanceId, windowOptions, onApplyGridOptions]);
  
  // Open Column Groups dialog
  const handleOpenColumnGroups = useCallback(async () => {
    await dialogService.openDialog({
      name: `column-groups-${viewInstanceId}`,
      route: '/column-groups',
      data: {
        columnDefs: columnDefs,
        currentGroups: unsavedColumnGroups || currentColumnGroups,
        profileName: activeProfileName
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 1000,
        defaultHeight: 700
      },
      onApply: (data) => {
        if (data?.groups) {
          onApplyColumnGroups(data.groups);
        }
      }
    });
  }, [columnDefs, unsavedColumnGroups, currentColumnGroups, activeProfileName, viewInstanceId, windowOptions, onApplyColumnGroups]);
  
  // Open Conditional Formatting dialog
  const handleOpenConditionalFormatting = useCallback(async () => {
    await dialogService.openDialog({
      name: `conditional-formatting-${viewInstanceId}`,
      route: '/conditional-formatting',
      data: {
        columnDefs: columnDefs.map(col => ({
          field: col.field,
          headerName: col.headerName,
          type: col.type
        })),
        currentRules: conditionalFormattingRules,
        profileName: activeProfileName
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 1200,
        defaultHeight: 800
      },
      onApply: (data) => {
        console.log('[useDialogManagement] Conditional formatting onApply called with data:', data);
        if (data?.rules) {
          console.log('[useDialogManagement] Applying conditional formatting rules:', data.rules);
          onApplyConditionalFormatting(data.rules);
        } else {
          console.warn('[useDialogManagement] No rules found in data:', data);
        }
      }
    });
  }, [columnDefs, conditionalFormattingRules, activeProfileName, viewInstanceId, windowOptions, onApplyConditionalFormatting]);
  
  // Open Rename View dialog
  const handleOpenRenameDialog = useCallback(async () => {
    try {
      await fin.View.getCurrent();
      setShowRenameDialog(true);
    } catch (error) {
      console.error('Failed to get current view title:', error);
      setShowRenameDialog(true);
    }
  }, []);
  
  // Expression Editor handlers
  const handleOpenExpressionEditor = useCallback(() => {
    setShowExpressionEditor(true);
  }, []);
  
  const handleExpressionSave = useCallback((_expression: string, mode: string) => {
    toast({
      title: "Expression Saved",
      description: `Expression saved in ${mode} mode`
    });
  }, [toast]);
  
  // Simple dialog state setters
  const handleOpenSaveDialog = useCallback(() => setShowSaveDialog(true), []);
  const handleOpenProfileDialog = useCallback(() => setShowProfileDialog(true), []);
  
  return {
    // Dialog visibility state
    showProfileDialog,
    setShowProfileDialog,
    showSaveDialog,
    setShowSaveDialog,
    showRenameDialog,
    setShowRenameDialog,
    showExpressionEditor,
    setShowExpressionEditor,
    
    // Dialog handlers
    handleOpenGridOptions,
    handleOpenColumnGroups,
    handleOpenConditionalFormatting,
    handleOpenRenameDialog,
    handleOpenExpressionEditor,
    handleOpenSaveDialog,
    handleOpenProfileDialog,
    handleExpressionSave
  };
}