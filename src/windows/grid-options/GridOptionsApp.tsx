import React, { useEffect, useState } from 'react';
import { GridOptionsEditorContent } from '@/windows/datagrid/components/DataGridStompShared/gridOptions/GridOptionsEditor';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import '@/index.css';

interface GridOptionsData {
  options: Record<string, any>;
  profileName?: string;
}

/**
 * Grid Options Dialog App
 * 
 * Standalone app that hosts the GridOptionsEditorContent component
 * and communicates with parent window via OpenFin IAB
 */
export const GridOptionsApp: React.FC = () => {
  const [initialData, setInitialData] = useState<GridOptionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  useEffect(() => {
    const initialize = async () => {
      try {
        // Set document title
        document.title = 'Grid Options';

        // Get theme from localStorage
        const inheritedTheme = localStorage.getItem('ui-theme') || 'dark';
        setTheme(inheritedTheme as 'light' | 'dark' | 'system');

        // Initialize dialog communication
        await initializeDialog({
          onInitialize: (data: GridOptionsData) => {
            console.log('[GridOptionsApp] Received initial data:', data);
            setInitialData(data);
            setIsLoading(false);
          },
          getData: () => initialData
        });

      } catch (error) {
        console.error('[GridOptionsApp] Initialization error:', error);
        
        // If running in development without OpenFin, use mock data
        if (typeof fin === 'undefined') {
          console.warn('[GridOptionsApp] Running without OpenFin - using mock data');
          setInitialData({
            options: {},
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

  const handleApply = async (options: Record<string, any>) => {
    try {
      console.log('[GridOptionsApp] Applying options:', options);
      
      // Send response to parent
      await sendDialogResponse('apply', { options });
      
    } catch (error) {
      console.error('[GridOptionsApp] Failed to apply options:', error);
      
      // If not in OpenFin, just log
      if (typeof fin === 'undefined') {
        console.log('[GridOptionsApp] Would send options:', options);
        window.close();
      }
    }
  };

  const handleClose = async () => {
    try {
      // Send cancel response to parent
      await sendDialogResponse('cancel');
      
    } catch (error) {
      console.error('[GridOptionsApp] Failed to close:', error);
      
      // If not in OpenFin, just close
      if (typeof fin === 'undefined') {
        window.close();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="text-lg">Loading Grid Options...</div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen">
        <div className="text-lg text-red-500 mb-4">Failed to load grid options</div>
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
    <ThemeProvider defaultTheme={theme} storageKey="grid-options-theme">
      <div className="h-screen w-screen overflow-hidden">
        <GridOptionsEditorContent
          currentOptions={initialData.options}
          onApply={handleApply}
          onClose={handleClose}
          profileName={initialData.profileName}
        />
        <Toaster />
      </div>
    </ThemeProvider>
  );
};