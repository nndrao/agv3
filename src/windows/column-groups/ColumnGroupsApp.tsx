import React, { useEffect, useState } from 'react';
import { ColumnGroupEditorContent } from '@/windows/datagrid/components/DataGridStompShared/columnGroups/ColumnGroupEditor';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import '@/index.css';

interface ColumnGroupsData {
  columnDefs: any[];
  currentGroups?: any[];
  profileName?: string;
}

/**
 * Column Groups Dialog App
 * 
 * Standalone app that hosts the ColumnGroupEditorContent component
 * and communicates with parent window via OpenFin IAB
 */
export const ColumnGroupsApp: React.FC = () => {
  const [initialData, setInitialData] = useState<ColumnGroupsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  useEffect(() => {
    const initialize = async () => {
      try {
        // Set document title
        document.title = 'Column Groups';

        // Get theme from localStorage
        const inheritedTheme = localStorage.getItem('ui-theme') || 'dark';
        setTheme(inheritedTheme as 'light' | 'dark' | 'system');

        // Initialize dialog communication
        await initializeDialog({
          onInitialize: (data: ColumnGroupsData) => {
            console.log('[ColumnGroupsApp] Received initial data:', data);
            setInitialData(data);
            setIsLoading(false);
          },
          getData: () => initialData
        });

      } catch (error) {
        console.error('[ColumnGroupsApp] Initialization error:', error);
        
        // If running in development without OpenFin, use mock data
        if (typeof fin === 'undefined') {
          console.warn('[ColumnGroupsApp] Running without OpenFin - using mock data');
          setInitialData({
            columnDefs: [
              { field: 'id', headerName: 'ID' },
              { field: 'name', headerName: 'Name' },
              { field: 'value', headerName: 'Value' },
              { field: 'status', headerName: 'Status' },
              { field: 'date', headerName: 'Date' }
            ],
            currentGroups: [],
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
  }, []);

  const handleApply = async (groups: any[]) => {
    try {
      console.log('[ColumnGroupsApp] Applying column groups:', groups);
      
      // Send response to parent
      await sendDialogResponse('apply', { groups });
      
    } catch (error) {
      console.error('[ColumnGroupsApp] Failed to apply groups:', error);
      
      // If not in OpenFin, just log
      if (typeof fin === 'undefined') {
        console.log('[ColumnGroupsApp] Would send groups:', groups);
        window.close();
      }
    }
  };

  const handleClose = async () => {
    try {
      // Send cancel response to parent
      await sendDialogResponse('cancel');
      
    } catch (error) {
      console.error('[ColumnGroupsApp] Failed to close:', error);
      
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
          onApply={handleApply}
          onClose={handleClose}
        />
        <Toaster />
      </div>
    </ThemeProvider>
  );
};