import { useState, useCallback, useMemo } from 'react';
import { dialogService } from '@/services/openfin/OpenFinDialogService';
import { useToast } from '@/hooks/use-toast';
import { ConditionalFormattingRule as ConditionalFormattingRuleRT } from '@/utils/conditionalFormattingRuntime';
import { CalculatedColumnDefinition } from '../types';
import { GridColumnGroupStorage } from '../columnGroups';

interface DialogManagementProps {
  viewInstanceId: string;
  activeProfileName?: string;
  columnDefs: any[];
  unsavedGridOptions: Record<string, any> | null;
  unsavedColumnGroups: string[] | null; // Now stores group IDs
  currentGridOptions: Record<string, any>;
  currentColumnGroups?: string[]; // Now stores group IDs
  conditionalFormattingRules: ConditionalFormattingRuleRT[];
  onApplyGridOptions: (options: Record<string, any>) => void;
  onApplyColumnGroups: (activeGroupIds: string[], allGroups: any[]) => void; // Updated signature
  onApplyConditionalFormatting: (rules: ConditionalFormattingRuleRT[]) => void;
  onApplyCalculatedColumns?: (columns: CalculatedColumnDefinition[]) => void;
  currentCalculatedColumns?: CalculatedColumnDefinition[];
  gridInstanceId: string; // Required for grid-level storage
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
  onApplyConditionalFormatting,
  onApplyCalculatedColumns,
  currentCalculatedColumns,
  gridInstanceId
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
    // Load all available groups from grid-level storage
    const allGroups = GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    const activeGroupIds = unsavedColumnGroups || currentColumnGroups || [];
    
    console.log('[🔍 DIALOG-OPEN-001] Opening column groups dialog with:', {
      hasUnsavedGroups: !!unsavedColumnGroups,
      unsavedGroupsCount: unsavedColumnGroups?.length || 0,
      currentGroupsCount: currentColumnGroups?.length || 0,
      allGroupsCount: allGroups.length,
      activeGroupIds: activeGroupIds
    });
    
    await dialogService.openDialog({
      name: `column-groups-${viewInstanceId}`,
      route: '/column-groups',
      data: {
        columnDefs: columnDefs,
        currentGroups: allGroups, // All available groups
        activeGroupIds: activeGroupIds, // Currently active group IDs
        profileName: activeProfileName,
        gridInstanceId: gridInstanceId
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 1000,
        defaultHeight: 700
      },
      onApply: (data) => {
        console.log('[🔍 DIALOG-APPLY-001] Column groups dialog apply callback:', {
          hasData: !!data,
          hasActiveGroupIds: !!data?.activeGroupIds,
          hasAllGroups: !!data?.allGroups,
          activeGroupIdsCount: data?.activeGroupIds?.length || 0,
          allGroupsCount: data?.allGroups?.length || 0
        });
        if (data?.activeGroupIds && data?.allGroups) {
          onApplyColumnGroups(data.activeGroupIds, data.allGroups);
        }
      }
    });
  }, [columnDefs, unsavedColumnGroups, currentColumnGroups, activeProfileName, viewInstanceId, windowOptions, onApplyColumnGroups, gridInstanceId]);
  
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

  // Open Calculated Columns dialog
  const handleOpenCalculatedColumns = useCallback(async () => {
    await dialogService.openDialog({
      name: `calculated-columns-${viewInstanceId}`,
      route: '/calculated-columns',
      data: {
        columnDefs: columnDefs.map(col => ({
          field: col.field,
          headerName: col.headerName,
          type: col.type
        })),
        profileName: activeProfileName,
        calculatedColumns: currentCalculatedColumns || []
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 1200,
        defaultHeight: 800
      },
      onApply: (data) => {
        if (data?.calculatedColumns && onApplyCalculatedColumns) {
          onApplyCalculatedColumns(data.calculatedColumns);
        }
      }
    });
  }, [columnDefs, activeProfileName, viewInstanceId, windowOptions, onApplyCalculatedColumns, currentCalculatedColumns]);
  
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
    handleOpenCalculatedColumns,
    handleOpenRenameDialog,
    handleOpenExpressionEditor,
    handleOpenSaveDialog,
    handleOpenProfileDialog,
    handleExpressionSave
  };
}