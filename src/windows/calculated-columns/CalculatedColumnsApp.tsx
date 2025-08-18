import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { useToast } from '@/hooks/use-toast';
import { CalculatedColumnDefinition } from '@/windows/datagrid/components/DataGridStompShared/types';
import { CalculatedColumnsEditorContent } from '@/windows/datagrid/components/DataGridStompShared/calculatedColumns/CalculatedColumnsEditorContent';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import '@/index.css';
import '@/windows/datagrid/components/DataGridStompShared/calculatedColumns/calculatedColumns.css';

interface ColumnInfo {
  field: string;
  headerName?: string;
  type?: string;
}

interface DialogInitData {
  columnDefs: ColumnInfo[];
  profileName?: string;
  currentColumns?: CalculatedColumnDefinition[]; // All available columns (grid-level)
  activeColumnIds?: string[]; // Currently active column IDs (profile-level)
  gridInstanceId?: string;
}

export const CalculatedColumnsApp: React.FC = () => {
  const { toast } = useToast();
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [columns, setColumns] = useState<CalculatedColumnDefinition[]>([]); // All available columns
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]); // Currently selected column IDs
  const [selectedId, setSelectedId] = useState<string | null>(null); // Currently editing column
  const [loading, setLoading] = useState(true);
  const [gridInstanceId, setGridInstanceId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initializedRef = useRef(false);



  // Use refs to store the latest data for getData callback
  const columnsRef = useRef(columns);
  const selectedColumnIdsRef = useRef(selectedColumnIds);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);
  useEffect(() => {
    selectedColumnIdsRef.current = selectedColumnIds;
  }, [selectedColumnIds]);

  useEffect(() => {
    // Ensure the OpenFin window title reflects the feature name
    try { document.title = 'Calculated Columns'; } catch {}

    const init = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      try {
        // Try to read customData first (most reliable)
        let bootstrap: DialogInitData | null = null;
        try {
          const windowOptions = await (window as any).fin?.Window?.getCurrent()?.getOptions();
          const customData = windowOptions?.customData;
          if (customData?.dialogData) {
            bootstrap = customData.dialogData as DialogInitData;
          }
        } catch {}

        // Initialize IAB to receive init payload
        initializeDialog({
          onInitialize: (data: DialogInitData) => {
            const src = data || bootstrap || {} as any;
            setAvailableColumns(src.columnDefs || []);
            setProfileName(src.profileName || '');
            setGridInstanceId(src.gridInstanceId || '');
            
            // Handle new data structure
            const allColumns = src.currentColumns || src.calculatedColumns || [];
            const activeIds = src.activeColumnIds || [];
            
            setColumns(allColumns);
            setSelectedColumnIds(activeIds);
            setSelectedId(allColumns[0]?.id || null);
            setLoading(false);
          },
          getData: () => ({ 
            activeColumnIds: selectedColumnIdsRef.current, 
            allColumns: columnsRef.current 
          }) // Return both selected IDs and all columns
        }).catch((err) => {
          console.warn('[CalculatedColumnsApp] initializeDialog failed (non-blocking):', err);
        });

        // If we already have bootstrap data, use it immediately until IAB arrives
        if (bootstrap) {
          setAvailableColumns(bootstrap.columnDefs || []);
          setProfileName(bootstrap.profileName || '');
          setGridInstanceId(bootstrap.gridInstanceId || '');
          
          // Handle new data structure
          const allColumns = bootstrap.currentColumns || bootstrap.calculatedColumns || [];
          const activeIds = bootstrap.activeColumnIds || [];
          
          setColumns(allColumns);
          setSelectedColumnIds(activeIds);
          setSelectedId(allColumns[0]?.id || null);
          setLoading(false);
        }
      } catch (err) {
        // non-OpenFin fallback
        console.warn('[CalculatedColumnsApp] initializeDialog failed or not in OpenFin:', err);
        try {
          // Attempt to read customData only
          const windowOptions = await (window as any).fin?.Window?.getCurrent()?.getOptions();
          const customData = windowOptions?.customData;
          const dialogData = customData?.dialogData as DialogInitData;
          if (dialogData) {
            setAvailableColumns(dialogData.columnDefs || []);
            setProfileName(dialogData.profileName || '');
            setGridInstanceId(dialogData.gridInstanceId || '');
            
            // Handle new data structure
            const allColumns = dialogData.currentColumns || dialogData.calculatedColumns || [];
            const activeIds = dialogData.activeColumnIds || [];
            
            setColumns(allColumns);
            setSelectedColumnIds(activeIds);
            setSelectedId(allColumns[0]?.id || null);
          }
        } catch {}
        setLoading(false);
      }
    };
    init();
  }, []);



  const handleApply = useCallback(async (selectedIds?: string[], allColumns?: CalculatedColumnDefinition[]) => {
    try {
      const columnIdsToApply = selectedIds || selectedColumnIds;
      const columnsToStore = allColumns || columns;
      
      console.log('[CalculatedColumnsApp] Applying columns:', {
        selectedIds: columnIdsToApply,
        totalColumns: columnsToStore.length
      });

      // Update local state
      setColumns(columnsToStore);
      setSelectedColumnIds(columnIdsToApply);

      // Send response to parent
      await sendDialogResponse('apply', { 
        activeColumnIds: columnIdsToApply, 
        allColumns: columnsToStore 
      });
      
      toast({ 
        title: 'Calculated Columns Applied', 
        description: `${columnIdsToApply.length} column(s) applied to profile ${profileName}` 
      });
    } catch (error) {
      console.error('[CalculatedColumnsApp] Failed to apply columns:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply columns',
        variant: 'destructive'
      });
    }
  }, [selectedColumnIds, columns, profileName, toast]);

  const handleClose = useCallback(async () => {
    console.log('[CalculatedColumnsApp] Sending close response');
    await sendDialogResponse('close');
  }, []);

  if (loading) {
    return <div className="h-full w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="calculated-columns-theme">
      <div className="flex-1 min-h-0">
        <CalculatedColumnsEditorContent
          columnDefs={availableColumns.map(col => ({
            field: col.field,
            headerName: col.headerName || col.field,
            type: col.type
          }))}
          currentColumns={columns}
          selectedColumnIds={selectedColumnIds}
          onApply={(selectedIds, allColumns) => {
            setColumns(allColumns);
            setSelectedColumnIds(selectedIds);
            handleApply(selectedIds, allColumns);
          }}
          onClose={handleClose}
          profileName={profileName}
          gridInstanceId={gridInstanceId}
        />
      </div>
      <Toaster />
    </ThemeProvider>
  );
};

export default CalculatedColumnsApp;


