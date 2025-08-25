import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { ConditionalFormattingEditorContent } from '@/windows/datagrid/components/DataGridStompShared/conditionalFormatting/ConditionalFormattingEditorContent';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { OpenFinServiceProvider } from '@/services/openfin/OpenFinServiceProvider';
import { useOpenFinServices } from '@/services/openfin/useOpenFinServices';
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
  currentRules?: ConditionalRule[]; // All available rules (grid-level)
  activeRuleIds?: string[]; // Currently active rule IDs (profile-level)
  profileName?: string;
  gridInstanceId?: string;
}

const ConditionalFormattingContent: React.FC = () => {
  const [rules, setRules] = useState<ConditionalRule[]>([]); // All available rules
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]); // Currently selected rule IDs
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>('');
  const [gridInstanceId, setGridInstanceId] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const { toast } = useToast();
  
  // Access centralized services
  const { logger, events } = useOpenFinServices();

  // Use refs to store the latest data for getData callback
  const rulesRef = useRef(rules);
  const selectedRuleIdsRef = useRef(selectedRuleIds);
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  useEffect(() => {
    selectedRuleIdsRef.current = selectedRuleIds;
  }, [selectedRuleIds]);

  useEffect(() => {
    const initialize = async () => {
      // Add null check for logger
      if (!logger) {
        console.log('[ConditionalFormattingApp] Logger not yet available, waiting...');
        return;
      }
      
      logger.info('[ConditionalFormattingApp] Starting initialization');
      
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
          const currentWindow = await (window as any).fin?.Window?.getCurrent();
          const windowOptions = await currentWindow?.getOptions();
          const customData = windowOptions?.customData;
          
          logger.debug('[ConditionalFormattingApp] Window options retrieved:', {
            hasWindowOptions: !!windowOptions,
            hasCustomData: !!customData,
            hasDialogData: !!customData?.dialogData,
            customDataKeys: customData ? Object.keys(customData) : []
          });
          
          if (customData?.dialogData) {
            dialogData = customData.dialogData;
            dataSource = 'customData';
            logger.debug('[ConditionalFormattingApp] Got data from customData:', {
              hasCurrentRules: !!dialogData.currentRules,
              currentRulesCount: dialogData.currentRules?.length || 0,
              hasActiveRuleIds: !!dialogData.activeRuleIds,
              activeRuleIdsCount: dialogData.activeRuleIds?.length || 0,
              profileName: dialogData.profileName,
              gridInstanceId: dialogData.gridInstanceId
            });
          } else {
            logger.debug('[ConditionalFormattingApp] No dialogData in customData');
          }
        } catch (e) {
          logger.warn('[ConditionalFormattingApp] Could not get customData:', e);
        }

        // 1b. Set up IAB communication for future updates (non-blocking)
        try {
          // Don't await this - let it initialize in the background
          // IMPORTANT: We must NOT return this promise from useEffect
          const initDialog = async () => {
            try {
              await initializeDialog({
                onInitialize: (data: ConditionalFormattingData) => {
                  if (logger) {
                    logger.debug('[ConditionalFormattingApp] Received data via IAB:', data);
                  }
                  
                  // Always update columns from parent window
                  if (data.columnDefs && data.columnDefs.length > 0) {
                    const columns = data.columnDefs.map(col => ({
                      field: col.field,
                      headerName: col.headerName || col.field,
                      type: col.type
                    }));
                    
                    // Only update if columns actually changed - use JSON comparison for deep equality
                    setAvailableColumns(prevColumns => {
                      const prevJson = JSON.stringify(prevColumns);
                      const newJson = JSON.stringify(columns);
                      return prevJson === newJson ? prevColumns : columns;
                    });
                    if (logger) {
                      logger.debug('[ConditionalFormattingApp] Updated columns from IAB:', { count: columns.length });
                    }
                  }
                  
                  // Update rules and selection if we don't have data yet or if this is newer
                  if (!dialogData || dataSource === 'localStorage') {
                    setRules(data.currentRules || []);
                    setSelectedRuleIds(data.activeRuleIds || []);
                    setProfileName(data.profileName || '');
                    setGridInstanceId(data.gridInstanceId || '');
                    if (logger) {
                      logger.debug('[ConditionalFormattingApp] Updated rules and selection from IAB');
                    }
                  }
                },
                getData: () => ({ 
                  activeRuleIds: selectedRuleIdsRef.current, 
                  allRules: rulesRef.current 
                }) // Return both selected IDs and all rules
              });
              if (logger) {
                logger.debug('[ConditionalFormattingApp] IAB initialization successful');
              }
            } catch (err) {
              // Non-critical - we already have data from customData or will use localStorage
              if (logger) {
                logger.warn('[ConditionalFormattingApp] IAB initialization failed (non-critical):', err);
              }
            }
          };
          
          // Call the async function without returning its promise
          initDialog();
        } catch (e) {
          if (logger) {
            logger.warn('[ConditionalFormattingApp] Could not set up IAB:', e);
          } else {
            console.warn('[ConditionalFormattingApp] Could not set up IAB:', e);
          }
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
            logger.debug('[ConditionalFormattingApp] Using localStorage data');
          }
        } catch (e) {
          logger.error('[ConditionalFormattingApp] Failed to load from localStorage:', e);
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
        setSelectedRuleIds(dialogData.activeRuleIds || []);
        setProfileName(dialogData.profileName || '');
        setGridInstanceId(dialogData.gridInstanceId || '');
        
        logger.info(`[ConditionalFormattingApp] Initialized with ${dataSource} data`, {
          columns: columns.length,
          rules: (dialogData.currentRules || []).length,
          selectedRules: (dialogData.activeRuleIds || []).length
        });
      } else {
        // No data available - use defaults
        logger.info('[ConditionalFormattingApp] No data available, using defaults');
        
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
      if (logger) {
        logger.info('[ConditionalFormattingApp] Initialization complete');
      } else {
        console.log('[ConditionalFormattingApp] Initialization complete');
      }
    };

    // Call initialize without returning its promise
    initialize();
    // IMPORTANT: useEffect must return nothing or a cleanup function, never a promise
  }, [logger]); // Re-run when logger becomes available

  const handleApply = async (selectedIds?: string[], allRules?: ConditionalRule[]) => {
    try {
      const ruleIdsToApply = selectedIds || selectedRuleIds;
      const rulesToStore = allRules || rules;
      
      // Add null check for logger
      if (logger) {
        logger.info('[ConditionalFormattingApp] Applying rules', {
          selectedIds: ruleIdsToApply,
          totalRules: rulesToStore.length
        });
      } else {
        console.log('[ConditionalFormattingApp] Applying rules', {
          selectedIds: ruleIdsToApply,
          totalRules: rulesToStore.length
        });
      }
      
      // Send response to parent with new format
      await sendDialogResponse('apply', { 
        activeRuleIds: ruleIdsToApply,
        allRules: rulesToStore 
      });
      
      // Show success message
      toast({
        title: 'Rules Applied',
        description: `${ruleIdsToApply.length} rule(s) applied to the grid`,
        variant: 'default'
      });
      
    } catch (error) {
      // Add null check for logger
      if (logger) {
        logger.error('[ConditionalFormattingApp] Failed to apply rules:', error);
      } else {
        console.error('[ConditionalFormattingApp] Failed to apply rules:', error);
      }
      
      // If not in OpenFin, just log and close
      if (typeof fin === 'undefined') {
        if (logger) {
          logger.debug('[ConditionalFormattingApp] Would send rules', {
            activeRuleIds: ruleIdsToApply,
            allRules: rulesToStore
          });
        } else {
          console.log('[ConditionalFormattingApp] Would send rules', {
            activeRuleIds: ruleIdsToApply,
            allRules: rulesToStore
          });
        }
        toast({
          title: 'Rules Configured',
          description: `${ruleIdsToApply.length} rule(s) configured (dev mode)`,
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
      // Add null check for logger
      if (logger) {
        logger.info('[ConditionalFormattingApp] Closing dialog');
      } else {
        console.log('[ConditionalFormattingApp] Closing dialog');
      }
      // Send close response to parent
      await sendDialogResponse('close');
      
    } catch (error) {
      // Add null check for logger
      if (logger) {
        logger.error('[ConditionalFormattingApp] Failed to close:', error);
      } else {
        console.error('[ConditionalFormattingApp] Failed to close:', error);
      }
      
      // If not in OpenFin, just close
      if (typeof fin === 'undefined') {
        window.close();
      }
    }
  };

  // Subscribe to theme changes
  useEffect(() => {
    // Add null checks for services
    if (!events || !logger) {
      return;
    }
    
    const handler = (themeInfo: any) => {
      logger.debug('[ConditionalFormattingApp] Theme changed', { theme: themeInfo.mode });
      setTheme(themeInfo.mode);
    };
    
    // EventEmitter's on() returns 'this', not an unsubscribe function
    // We need to manually create the cleanup
    events.on('theme:changed', handler);
    
    // Return a cleanup function that removes the listener
    return () => {
      events.off('theme:changed', handler);
    };
  }, [events, logger]);

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
            selectedRuleIds={selectedRuleIds}
            onApply={(selectedIds, allRules) => {
              setRules(allRules);
              setSelectedRuleIds(selectedIds);
              handleApply(selectedIds, allRules);
            }}
            onClose={handleClose}
            profileName={profileName}
            gridInstanceId={gridInstanceId}
          />
        </div>
        <Toaster />
      </ThemeProvider>
    </div>
  );
};

export const ConditionalFormattingApp: React.FC = () => {
  const viewId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('viewId') || `conditional-formatting-${Date.now()}`;
  }, []);

  return (
    <OpenFinServiceProvider
      viewId={viewId}
      services={['logging', 'events']}
      logLevel="info"
      subscribeToThemeEvents={true}
    >
      <ConditionalFormattingContent />
    </OpenFinServiceProvider>
  );
};