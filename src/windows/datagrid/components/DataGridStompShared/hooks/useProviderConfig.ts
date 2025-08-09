import { useState, useCallback, useEffect, useRef } from 'react';
import { StorageClient } from '@/services/storage/storageClient';
import { useToast } from '@/hooks/use-toast';
import { ColDef } from 'ag-grid-community';
import { ProviderConfig } from '../types';
import { agGridValueFormatters } from '@/components/ag-grid/value-formatters';
import { agGridComponents } from '@/components/ag-grid/cell-renderers';

interface UseProviderConfigResult {
  providerConfig: ProviderConfig | null;
  columnDefs: ColDef[];
  isLoading: boolean;
  loadProviderConfig: (providerId: string) => Promise<void>;
}

// Cache for loaded configs to prevent redundant loads
const configCache = new Map<string, ProviderConfig>();

export function useProviderConfig(selectedProviderId: string | null): UseProviderConfigResult {
  const { toast } = useToast();
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref to track the current loading provider ID
  const loadingProviderIdRef = useRef<string | null>(null);
  
  // Stable function to process column definitions
  const processColumnDefinitions = useCallback((columns: any[]): ColDef[] => {
    return columns.map((col: any) => {
      const processedCol = { ...col };
      
      // Debug logging
      if (col.valueFormatter || col.cellRenderer) {
        console.log(`Processing column ${col.field}:`, {
          originalValueFormatter: col.valueFormatter,
          originalCellRenderer: col.cellRenderer
        });
      }
      
      // Resolve string-based valueFormatter to actual function
      if (col.valueFormatter && typeof col.valueFormatter === 'string') {
        const formatterFunc = agGridValueFormatters[col.valueFormatter as keyof typeof agGridValueFormatters];
        if (formatterFunc) {
          processedCol.valueFormatter = formatterFunc;
          console.log(`✅ Resolved valueFormatter '${col.valueFormatter}' for column ${col.field}`);
        } else {
          console.warn(`❌ Could not resolve valueFormatter '${col.valueFormatter}' for column ${col.field}`);
          processedCol.valueFormatter = undefined;
        }
      }
      
      // Verify cellRenderer exists in components
      if (col.cellRenderer && typeof col.cellRenderer === 'string') {
        if (agGridComponents[col.cellRenderer as keyof typeof agGridComponents]) {
          console.log(`✅ CellRenderer '${col.cellRenderer}' exists for column ${col.field}`);
        } else {
          console.warn(`❌ CellRenderer '${col.cellRenderer}' not found for column ${col.field}`);
        }
      }
      
      return processedCol;
    });
  }, []);
  
  // Stable function to load provider config
  const loadProviderConfig = useCallback(async (providerId: string) => {
    // Check cache first
    if (configCache.has(providerId)) {
      const cachedConfig = configCache.get(providerId)!;
      setProviderConfig(cachedConfig);
      if (cachedConfig.columnDefinitions) {
        setColumnDefs(processColumnDefinitions(cachedConfig.columnDefinitions));
      }
      return;
    }
    
    // Prevent concurrent loads of the same provider
    if (loadingProviderIdRef.current === providerId) {
      console.log('[useProviderConfig] Already loading provider:', providerId);
      return;
    }
    
    console.log('[useProviderConfig] Loading provider config for:', providerId);
    loadingProviderIdRef.current = providerId;
    setIsLoading(true);
    
    try {
      const config = await StorageClient.get(providerId);
      console.log('[useProviderConfig] Loaded config from storage:', config);
      
      if (config) {
        // The config structure might be flat, not nested
        const stompConfig = config.config || config;
        
        // Cache the config
        configCache.set(providerId, stompConfig);
        
        // Only update state if this provider is still selected
        if (loadingProviderIdRef.current === providerId) {
          setProviderConfig(stompConfig);
          console.log('[useProviderConfig] Set provider config:', stompConfig);
          
          // Set column definitions from config
          if (stompConfig.columnDefinitions && stompConfig.columnDefinitions.length > 0) {
            const processedColumns = processColumnDefinitions(stompConfig.columnDefinitions);
            setColumnDefs(processedColumns);
            console.log('[🔍][PROVIDER_CONFIG] Set column definitions:', processedColumns.length, 'columns');
            console.log('[🔍][PROVIDER_CONFIG] Column defs are now available - grid can be created');
          } else {
            console.log('[🔍][PROVIDER_CONFIG] No column definitions in config');
          }
        }
      }
    } catch (error) {
      console.error('[useProviderConfig] Failed to load provider config:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to load provider configuration",
        variant: "destructive"
      });
    } finally {
      if (loadingProviderIdRef.current === providerId) {
        setIsLoading(false);
        loadingProviderIdRef.current = null;
      }
    }
  }, [processColumnDefinitions, toast]);
  
  // Load provider configuration when selected
  useEffect(() => {
    console.log('[🔍][PROVIDER_CONFIG] Provider ID changed:', selectedProviderId);
    if (!selectedProviderId) {
      console.log('[🔍][PROVIDER_CONFIG] No provider ID, clearing config');
      setProviderConfig(null);
      setColumnDefs([]);
      return;
    }
    
    console.log('[🔍][PROVIDER_CONFIG] Loading config for provider:', selectedProviderId);
    loadProviderConfig(selectedProviderId);
  }, [selectedProviderId, loadProviderConfig]);
  
  return {
    providerConfig,
    columnDefs,
    isLoading,
    loadProviderConfig
  };
}