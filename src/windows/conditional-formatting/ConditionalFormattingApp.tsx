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
      try {
        // Set document title
        document.title = 'Conditional Formatting Rules';

        // Get theme from localStorage
        const inheritedTheme = localStorage.getItem('ui-theme') || 'dark';
        setTheme(inheritedTheme as 'light' | 'dark' | 'system');

        // Initialize dialog communication
        await initializeDialog({
          onInitialize: (data: ConditionalFormattingData) => {
            console.log('[ConditionalFormattingApp] Received initial data:', data);
            
            // Convert column definitions to the format expected by the component
            const columns = data.columnDefs.map(col => ({
              field: col.field,
              headerName: col.headerName || col.field,
              type: col.type
            }));
            
            setAvailableColumns(columns);
            setRules(data.currentRules || []);
            setProfileName(data.profileName || '');
            setIsLoading(false);
          },
          getData: () => ({ rules })
        });

      } catch (error) {
        console.error('[ConditionalFormattingApp] Initialization error:', error);
        
        // If running in development without OpenFin, use mock data
        if (typeof fin === 'undefined') {
          console.warn('[ConditionalFormattingApp] Running without OpenFin - using mock data');
          
          setAvailableColumns([
            { field: 'id', headerName: 'ID', type: 'number' },
            { field: 'name', headerName: 'Name', type: 'string' },
            { field: 'value', headerName: 'Value', type: 'number' },
            { field: 'price', headerName: 'Price', type: 'number' },
            { field: 'quantity', headerName: 'Quantity', type: 'number' },
            { field: 'status', headerName: 'Status', type: 'string' },
            { field: 'date', headerName: 'Date', type: 'date' }
          ]);
          setRules([]);
          setIsLoading(false);
          
          toast({
            title: 'Development Mode',
            description: 'Running without OpenFin - using mock data',
            variant: 'default'
          });
        } else {
          // Show error and allow closing
          setIsLoading(false);
        }
      }
    };

    initialize();
  }, []);

  const handleApply = async (updatedRules?: ConditionalRule[]) => {
    try {
      const rulesToApply = updatedRules || rules;
      
      console.log('[ConditionalFormattingApp] Applying rules:', rulesToApply);
      
      // Send response to parent
      await sendDialogResponse('apply', { rules: rulesToApply });
      
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

  const handleCancel = async () => {
    try {
      // Send cancel response to parent
      await sendDialogResponse('cancel');
      
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
            onClose={handleCancel}
            profileName={profileName}
          />
        </div>
        <Toaster />
      </ThemeProvider>
    </div>
  );
};