import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpressionEditor } from '@/components/expression-editor/ExpressionEditor';
import { CalculatedColumnDefinition } from '@/windows/datagrid/components/DataGridStompShared/types';

interface ColumnInfo {
  field: string;
  headerName?: string;
  type?: string;
}

interface DialogInitData {
  columnDefs: ColumnInfo[];
  profileName?: string;
  calculatedColumns?: CalculatedColumnDefinition[];
}

export const CalculatedColumnsApp: React.FC = () => {
  const { toast } = useToast();
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [columns, setColumns] = useState<CalculatedColumnDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const selected = useMemo(() => columns.find(c => c.id === selectedId) || null, [columns, selectedId]);

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
            const calc = (src.calculatedColumns as CalculatedColumnDefinition[]) || [];
            setColumns(calc);
            setSelectedId(calc[0]?.id || null);
            setLoading(false);
          },
          getData: () => ({ calculatedColumns: columns })
        }).catch((err) => {
          console.warn('[CalculatedColumnsApp] initializeDialog failed (non-blocking):', err);
        });

        // If we already have bootstrap data, use it immediately until IAB arrives
        if (bootstrap) {
          setAvailableColumns(bootstrap.columnDefs || []);
          setProfileName(bootstrap.profileName || '');
          const calc = (bootstrap.calculatedColumns as CalculatedColumnDefinition[]) || [];
          setColumns(calc);
          setSelectedId(calc[0]?.id || null);
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
            const calc = (dialogData.calculatedColumns as CalculatedColumnDefinition[]) || [];
            setColumns(calc);
            setSelectedId(calc[0]?.id || null);
          }
        } catch {}
        setLoading(false);
      }
    };
    init();
  }, []);

  const addColumn = useCallback(() => {
    const id = `calc_${Date.now()}`;
    const newCol: CalculatedColumnDefinition = {
      id,
      field: id,
      headerName: 'Calculated',
      expression: '',
      cellDataType: 'number'
    };
    setColumns(prev => [...prev, newCol]);
    setSelectedId(id);
  }, []);

  const updateSelected = useCallback((patch: Partial<CalculatedColumnDefinition>) => {
    setColumns(prev => prev.map(c => (c.id === selectedId ? { ...c, ...patch } : c)));
  }, [selectedId]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setColumns(prev => prev.filter(c => c.id !== selectedId));
    setSelectedId(prev => {
      const next = columns.find(c => c.id !== prev)?.id || null;
      return next;
    });
  }, [selectedId, columns]);

  const handleApply = useCallback(async () => {
    console.log('[CalculatedColumnsApp] Sending apply response with columns:', columns);
    await sendDialogResponse('apply', { calculatedColumns: columns });
    toast({ title: 'Applied', description: `${columns.length} calculated column(s) saved to profile ${profileName}` });
  }, [columns, profileName, toast]);

  const handleClose = useCallback(async () => {
    console.log('[CalculatedColumnsApp] Sending close response');
    await sendDialogResponse('close');
  }, []);

  if (loading) {
    return <div className="h-full w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0 flex">
        <div className="w-64 border-r p-2">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-1">
              {columns.map(col => (
                <Button key={col.id} variant={selectedId === col.id ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedId(col.id)}>
                  <span className="truncate">{col.headerName || col.field}</span>
                </Button>
              ))}
              {columns.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">No calculated columns yet</div>
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-2 gap-3 p-3 border-b">
                <div>
                  <Label>Field</Label>
                  <Input value={selected.field} onChange={e => updateSelected({ field: e.target.value })} />
                </div>
                <div>
                  <Label>Header Name</Label>
                  <Input value={selected.headerName} onChange={e => updateSelected({ headerName: e.target.value })} />
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Tabs defaultValue="expression" className="h-full flex flex-col">
                  <TabsList className="px-3 py-2 border-b justify-start">
                    <TabsTrigger value="expression">Expression</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="expression" className="flex-1 min-h-0 m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <div className="flex-1 min-h-0">
                      <ExpressionEditor
                        mode="calculation"
                        initialExpression={selected.expression || ''}
                        availableColumns={availableColumns}
                        onChange={(expr, _valid) => updateSelected({ expression: expr })}
                        showPreview={true}
                        showHistory={true}
                        height="100%"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="flex-1 m-0 p-0">
                    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                      Use Apply to save to profile. Preview execution can be added later.
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">Select a calculated column to edit</div>
          )}
        </div>
      </div>
      <div className="px-4 py-2 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Profile: {profileName || 'Current'}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addColumn}>Add</Button>
          <Button variant="outline" size="sm" onClick={removeSelected} disabled={!selectedId}>Delete</Button>
          <Button size="sm" onClick={handleApply}>Apply</Button>
          <Button size="sm" variant="secondary" onClick={handleClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default CalculatedColumnsApp;


