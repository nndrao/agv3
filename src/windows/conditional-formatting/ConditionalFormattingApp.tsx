import React, { useEffect, useState } from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { ConditionalFormattingEditorContent } from '@/windows/datagrid/components/DataGridStompShared/conditionalFormatting/ConditionalFormattingEditorContent';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import '@/index.css';

interface ColumnInfo {
  field: string;
  headerName: string;
  type?: string;
}

interface ConditionalFormattingData {
  columnDefs: Array<{
    field: string;
    headerName?: string;
    type?: string;
  }>;
  currentRules?: ConditionalRule[];
  profileName?: string;
}

export const ConditionalFormattingApp: React.FC = () => {
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const { toast } = useToast();

  useEffect(() => {
    const initialize = async () => {
      console.log('[ConditionalFormattingApp] Starting initialization');
      
      // Set document title
      document.title = 'Conditional Formatting Rules';

      // Get theme from localStorage
      const inheritedTheme = localStorage.getItem('ui-theme') || 'dark';
      setTheme(inheritedTheme as 'light' | 'dark' | 'system');

      // Step 1: Get initial data (deterministic order of preference)
      let dialogData: ConditionalFormattingData | null = null;
      let dataSource = 'none';

      // Check if running in OpenFin
      const isOpenFin = typeof fin !== 'undefined';
      
      if (isOpenFin) {
        // 1a. Try to get data from window customData (most reliable in OpenFin)
        try {
          const windowOptions = await (window as any).fin?.Window?.getCurrent()?.getOptions();
          const customData = windowOptions?.customData;
          if (customData?.dialogData) {
            dialogData = customData.dialogData;
            dataSource = 'customData';
            console.log('[ConditionalFormattingApp] Got data from customData');
          }
        } catch (e) {
          console.warn('[ConditionalFormattingApp] Could not get customData:', e);
        }

        // 1b. Set up IAB communication for future updates (non-blocking)
        try {
          initializeDialog({
            onInitialize: (data: ConditionalFormattingData) => {
              console.log('[ConditionalFormattingApp] Received data via IAB:', data);
              
              // Always update columns from parent window
              if (data.columnDefs && data.columnDefs.length > 0) {
                const columns = data.columnDefs.map(col => ({
                  field: col.field,
                  headerName: col.headerName || col.field,
                  type: col.type
                }));
                
                // Only update if columns actually changed
                setAvailableColumns(prevColumns => {
                  // Check if columns are different
                  if (prevColumns.length !== columns.length) {
                    return columns;
                  }
                  const isDifferent = columns.some((col, idx) => 
                    col.field !== prevColumns[idx]?.field || 
                    col.headerName !== prevColumns[idx]?.headerName
                  );
                  return isDifferent ? columns : prevColumns;
                });
                console.log('[ConditionalFormattingApp] Updated columns from IAB:', columns.length);
              }
              
              // Update rules if we don't have data yet or if this is newer
              if (!dialogData || dataSource === 'localStorage') {
                setRules(data.currentRules || []);
                setProfileName(data.profileName || '');
                console.log('[ConditionalFormattingApp] Updated rules from IAB');
              }
            },
            getData: () => ({ rules })
          }).catch(err => {
            // Non-critical - we already have data from customData or will use localStorage
            console.warn('[ConditionalFormattingApp] IAB initialization failed (non-critical):', err);
          });
        } catch (e) {
          console.warn('[ConditionalFormattingApp] Could not set up IAB:', e);
        }
      }

      // Step 2: If no dialog data yet, use localStorage as fallback
      if (!dialogData) {
        try {
          const storedRules = localStorage.getItem('conditionalFormattingRules');
          if (storedRules) {
            dialogData = {
              columnDefs: [], // Will use default columns
              currentRules: JSON.parse(storedRules),
              profileName: ''
            };
            dataSource = 'localStorage';
            console.log('[ConditionalFormattingApp] Using localStorage data');
          }
        } catch (e) {
          console.error('[ConditionalFormattingApp] Failed to load from localStorage:', e);
        }
      }

      // Step 3: Apply the data we have (or use defaults)
      if (dialogData) {
        // Process column definitions
        const columns = dialogData.columnDefs && dialogData.columnDefs.length > 0
          ? dialogData.columnDefs.map(col => ({
              field: col.field,
              headerName: col.headerName || col.field,
              type: col.type
            }))
          : [
              // Default columns if none provided
              { field: 'value', headerName: 'Value', type: 'number' },
              { field: 'price', headerName: 'Price', type: 'number' },
              { field: 'quantity', headerName: 'Quantity', type: 'number' },
              { field: 'status', headerName: 'Status', type: 'string' }
            ];
        
        setAvailableColumns(columns);
        setRules(dialogData.currentRules || []);
        setProfileName(dialogData.profileName || '');
        
        console.log(`[ConditionalFormattingApp] Initialized with ${dataSource} data:`, {
          columns: columns.length,
          rules: (dialogData.currentRules || []).length
        });
      } else {
        // No data available - use defaults
        console.log('[ConditionalFormattingApp] No data available, using defaults');
        
        setAvailableColumns([
          { field: 'value', headerName: 'Value', type: 'number' },
          { field: 'price', headerName: 'Price', type: 'number' },
          { field: 'quantity', headerName: 'Quantity', type: 'number' },
          { field: 'status', headerName: 'Status', type: 'string' }
        ]);
        setRules([]);
        setProfileName('');
      }

      // Mark as loaded
      setIsLoading(false);
      console.log('[ConditionalFormattingApp] Initialization complete');
    };

    initialize();
  }, []); // Remove toast from dependencies to prevent re-initialization

  const handleApply = async (updatedRules?: ConditionalRule[]) => {
    try {
      const rulesToApply = updatedRules || rules;
      
      console.log('[ConditionalFormattingApp] Applying rules:', rulesToApply);
      
      // Send response to parent
      await sendDialogResponse('apply', { rules: rulesToApply });
      
      // Show success message
      toast({
        title: 'Rules Applied',
        description: `${rulesToApply.filter(r => r.enabled).length} active rule(s) applied to the grid`,
        variant: 'default'
      });
      
    } catch (error) {
      console.error('[ConditionalFormattingApp] Failed to apply rules:', error);
      
      // If not in OpenFin, just log and close
      if (typeof fin === 'undefined') {
        console.log('[ConditionalFormattingApp] Would send rules:', rulesToApply);
        toast({
          title: 'Rules Configured',
          description: `${rulesToApply.length} rule(s) configured (dev mode)`,
          variant: 'default'
        });
        setTimeout(() => window.close(), 1000);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to apply rules',
          variant: 'destructive'
        });
      }
    }
  };

  const handleClose = async () => {
    try {
      // Send close response to parent
      await sendDialogResponse('close');
      
    } catch (error) {
      console.error('[ConditionalFormattingApp] Failed to close:', error);
      
      // If not in OpenFin, just close
      if (typeof fin === 'undefined') {
        window.close();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <ThemeProvider defaultTheme={theme} storageKey="conditional-formatting-theme">
        <div className="flex-1 min-h-0">
          <ConditionalFormattingEditorContent
            columnDefs={availableColumns.map(col => ({
              field: col.field,
              headerName: col.headerName || col.field,
              type: col.type
            }))}
            currentRules={rules}
            onApply={(updatedRules) => {
              setRules(updatedRules);
              handleApply(updatedRules);
            }}
            onClose={handleClose}
            profileName={profileName}
          />
        </div>
        <Toaster />
      </ThemeProvider>
    </div>
  );
};