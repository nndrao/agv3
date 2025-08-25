import React, { useEffect, useState } from 'react';
import { ColumnGroupEditorContent } from '@/windows/datagrid/components/DataGridStompShared/columnGroups/ColumnGroupEditor';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { withOpenFinServices } from '@/utils/withOpenFinServices';
import { useOpenFinServices } from '@/services/openfin/useOpenFinServices';
import '@/index.css';

interface ColumnGroupsData {
  columnDefs: any[];
  currentGroups?: any[];
  activeGroupIds?: string[];
  profileName?: string;
  gridInstanceId?: string;
}

/**
 * Column Groups Dialog App
 * 
 * Standalone app that hosts the ColumnGroupEditorContent component
 * and communicates with parent window via OpenFin IAB
 */
const ColumnGroupsAppContent: React.FC = () => {
  const [initialData, setInitialData] = useState<ColumnGroupsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  
  // Access centralized services
  const { logger, events } = useOpenFinServices();

  useEffect(() => {
    const initialize = async () => {
      try {
        logger.info('[ColumnGroupsApp] Starting initialization');
        
        // Set document title
        document.title = 'Column Groups';

        // Get theme from localStorage
        const inheritedTheme = localStorage.getItem('ui-theme') || 'dark';
        setTheme(inheritedTheme as 'light' | 'dark' | 'system');

        // Initialize dialog communication
        await initializeDialog({
          onInitialize: (data: ColumnGroupsData) => {
            logger.info('[ColumnGroupsApp] Received initial data', {
              columns: data.columnDefs?.length || 0,
              groups: data.currentGroups?.length || 0
            });
            setInitialData(data);
            setIsLoading(false);
          },
          getData: () => initialData
        });

      } catch (error) {
        logger.error('[ColumnGroupsApp] Initialization error:', error);
        
        // If running in development without OpenFin, use mock data
        if (typeof fin === 'undefined') {
          logger.warn('[ColumnGroupsApp] Running without OpenFin - using mock data');
          setInitialData({
            columnDefs: [
              { field: 'id', headerName: 'ID' },
              { field: 'name', headerName: 'Name' },
              { field: 'value', headerName: 'Value' },
              { field: 'status', headerName: 'Status' },
              { field: 'date', headerName: 'Date' }
            ],
            currentGroups: [],
            activeGroupIds: [],
            profileName: 'Development'
          });
          setIsLoading(false);
        } else {
          // Show error and allow closing
          setIsLoading(false);
        }
      }
    };

    initialize();
  }, [logger]);

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = events.on('theme:changed', (themeInfo) => {
      logger.debug('[ColumnGroupsApp] Theme changed', { theme: themeInfo.mode });
      setTheme(themeInfo.mode);
    });
    
    return unsubscribe;
  }, [events, logger]);

  const handleApply = async (activeGroupIds: string[], allGroups: any[]) => {
    try {
      logger.info('[ColumnGroupsApp] Applying column groups', {
        activeGroupIds: activeGroupIds.length,
        totalGroups: allGroups.length
      });
      
      // Send response to parent with new format
      await sendDialogResponse('apply', { 
        activeGroupIds,
        allGroups 
      });
      
    } catch (error) {
      logger.error('[ColumnGroupsApp] Failed to apply groups:', error);
      
      // If not in OpenFin, just log
      if (typeof fin === 'undefined') {
        logger.debug('[ColumnGroupsApp] Would send:', { activeGroupIds, allGroups });
        window.close();
      }
    }
  };

  const handleClose = async () => {
    try {
      logger.info('[ColumnGroupsApp] Closing dialog');
      // Send cancel response to parent
      await sendDialogResponse('cancel');
      
    } catch (error) {
      logger.error('[ColumnGroupsApp] Failed to close:', error);
      
      // If not in OpenFin, just close
      if (typeof fin === 'undefined') {
        window.close();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="text-lg">Loading Column Groups...</div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen">
        <div className="text-lg text-red-500 mb-4">Failed to load column groups</div>
        <button 
          onClick={handleClose}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme={theme} storageKey="column-groups-theme">
      <div className="h-screen w-screen overflow-hidden">
        <ColumnGroupEditorContent
          gridApi={null} // Not needed in standalone mode
          columnApi={null} // Not needed in standalone mode
          columnDefs={initialData.columnDefs}
          currentGroups={initialData.currentGroups}
          activeGroupIds={initialData.activeGroupIds || []}
          onApply={handleApply}
          onClose={handleClose}
        />
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

// Wrap with OpenFinServiceProvider using HOC
export const ColumnGroupsApp = withOpenFinServices(ColumnGroupsAppContent, {
  services: ['logging', 'events'],
  logLevel: 'info',
  subscribeToThemeEvents: true
});