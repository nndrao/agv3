import React, { useEffect, useState } from 'react';
import { GridConfigurationBus, ColumnInfo } from '@/services/iab/GridConfigurationBus';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { ConditionalFormattingEditorContent } from '@/windows/datagrid/components/DataGridStompShared/conditionalFormatting/ConditionalFormattingEditorContent';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import '@/index.css';

export const ConditionalFormattingApp: React.FC = () => {
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewId, setViewId] = useState<string>('');
  const { toast } = useToast();

  const bus = GridConfigurationBus.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Set document title
        document.title = 'Conditional Formatting Rules';
        
        // Get viewId from window custom data or URL params
        const customData = await fin.me.getOptions();
        const params = new URLSearchParams(window.location.search);
        const id = customData.customData?.viewId || params.get('viewId');
        
        if (!id) {
          throw new Error('No viewId provided');
        }
        
        setViewId(id);

        // Initialize bus as client
        await bus.initializeAsClient();

        // Get available columns
        const columns = await bus.sendRequest<ColumnInfo[]>({
          type: 'GET_AVAILABLE_COLUMNS',
          viewId: id
        });
        setAvailableColumns(columns);

        // Get current profile to retrieve existing rules
        const profile = await bus.sendRequest<any>({
          type: 'GET_PROFILE',
          viewId: id
        });
        
        if (profile?.conditionalFormatting) {
          setRules(profile.conditionalFormatting);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('[ConditionalFormattingApp] Initialization error:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize conditional formatting',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      bus.destroy();
    };
  }, []);

  const handleApply = async (updatedRules?: ConditionalRule[]) => {
    try {
      const rulesToApply = updatedRules || rules;
      
      // Send rules to the grid
      await bus.sendRequest({
        type: 'APPLY_CONDITIONAL_FORMATTING',
        viewId,
        rules: rulesToApply
      });

      toast({
        title: 'Success',
        description: 'Conditional formatting rules applied'
      });

      // Close the window after a short delay
      setTimeout(() => {
        fin.me.close();
      }, 1000);
    } catch (error) {
      console.error('[ConditionalFormattingApp] Failed to apply rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply conditional formatting rules',
        variant: 'destructive'
      });
    }
  };

  const handleCancel = () => {
    fin.me.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
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
        profileName={viewId}
      />
      <Toaster />
    </>
  );
};