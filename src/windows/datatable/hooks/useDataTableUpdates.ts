import { useEffect, useRef, useCallback } from 'react';
import { GridApi } from 'ag-grid-community';

export interface UseDataTableUpdatesOptions {
  gridApi: GridApi | null;
  keyColumn: string;
  snapshotMode: 'idle' | 'requesting' | 'receiving' | 'complete';
  asyncTransactionWaitMillis?: number;
  updatesEnabled?: boolean;
  onUpdateError?: (error: Error) => void;
  onUpdateMetrics?: (metrics: UpdateMetrics) => void;
}

export interface UpdateMetrics {
  totalUpdates: number;
  successfulUpdates: number;
  failedUpdates: number;
  lastUpdateTime: number;
  updateLatency: number;
  batchSize: number;
}

interface DataUpdate {
  operation?: 'add' | 'update' | 'remove';
  data: any;
}

export function useDataTableUpdates({
  gridApi,
  keyColumn,
  snapshotMode,
  asyncTransactionWaitMillis = 50,
  updatesEnabled = true,
  onUpdateError,
  onUpdateMetrics
}: UseDataTableUpdatesOptions) {
  const updateBatchRef = useRef<DataUpdate[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsRef = useRef<UpdateMetrics>({
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    lastUpdateTime: 0,
    updateLatency: 0,
    batchSize: 0
  });

  // Configure AG-Grid async transaction timing when grid is ready
  useEffect(() => {
    if (!gridApi) return;

    // Set async transaction wait time
    if (asyncTransactionWaitMillis !== undefined) {
      gridApi.setGridOption('asyncTransactionWaitMillis', asyncTransactionWaitMillis);
    }

    // Enable cell flash duration for visual feedback
    gridApi.setGridOption('cellFlashDuration', 2000);

    console.log('[useDataTableUpdates] Grid configured:', {
      keyColumn,
      asyncTransactionWaitMillis,
      cellFlashDuration: 2000
    });
  }, [gridApi, keyColumn, asyncTransactionWaitMillis]);

  // Apply batched updates to the grid
  const applyBatchedUpdates = useCallback(() => {
    if (!gridApi || updateBatchRef.current.length === 0) return;

    const startTime = Date.now();
    const batch = updateBatchRef.current;
    updateBatchRef.current = [];

    console.log(`[useDataTableUpdates] Applying ${batch.length} batched updates`);

    // Group updates by operation type
    const transaction: any = {
      add: [],
      update: [],
      remove: []
    };

    // Process each update
    batch.forEach((update) => {
      const operation = update.operation || 'update';
      
      switch (operation) {
        case 'add':
          transaction.add.push(update.data);
          break;
        case 'update':
          transaction.update.push(update.data);
          break;
        case 'remove':
          transaction.remove.push(update.data);
          break;
      }
    });

    // Apply transaction to grid
    try {
      console.log('[useDataTableUpdates] Applying transaction:', {
        add: transaction.add.length,
        update: transaction.update.length,
        remove: transaction.remove.length,
        keyColumn
      });

      // Use applyTransactionAsync for better performance
      const result = gridApi.applyTransactionAsync(transaction);

      if (result) {
        const latency = Date.now() - startTime;
        
        // Update metrics
        metricsRef.current.totalUpdates += batch.length;
        metricsRef.current.successfulUpdates += batch.length;
        metricsRef.current.lastUpdateTime = Date.now();
        metricsRef.current.updateLatency = latency;
        metricsRef.current.batchSize = batch.length;

        console.log('[useDataTableUpdates] Transaction applied successfully:', {
          batchSize: batch.length,
          latency: `${latency}ms`
        });

        // Report metrics if callback provided
        if (onUpdateMetrics) {
          onUpdateMetrics({ ...metricsRef.current });
        }
      }
    } catch (error) {
      console.error('[useDataTableUpdates] Error applying transaction:', error);
      
      // Update failure metrics
      metricsRef.current.totalUpdates += batch.length;
      metricsRef.current.failedUpdates += batch.length;
      
      if (onUpdateError) {
        onUpdateError(error as Error);
      }

      // Report metrics even on error
      if (onUpdateMetrics) {
        onUpdateMetrics({ ...metricsRef.current });
      }
    }
  }, [gridApi, keyColumn, onUpdateError, onUpdateMetrics]);

  // Process incoming updates
  const processUpdates = useCallback((updates: any[]) => {
    // Only process updates if snapshot is complete and updates are enabled
    if (snapshotMode !== 'complete' || !updatesEnabled || !gridApi) {
      console.log('[useDataTableUpdates] Skipping updates:', {
        snapshotMode,
        updatesEnabled,
        hasGridApi: !!gridApi
      });
      return;
    }

    // Check if we have a key column configured
    if (!keyColumn) {
      console.error('[useDataTableUpdates] No key column defined for updates');
      return;
    }

    console.log(`[useDataTableUpdates] Processing ${updates.length} updates`);

    // Convert updates to DataUpdate format
    const dataUpdates: DataUpdate[] = updates.map(update => ({
      operation: update.operation || 'update',
      data: update.data || update
    }));

    // Add updates to batch
    updateBatchRef.current.push(...dataUpdates);

    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // Set new timer to apply updates after a short delay
    updateTimerRef.current = setTimeout(() => {
      applyBatchedUpdates();
      updateTimerRef.current = null;
    }, asyncTransactionWaitMillis);
  }, [snapshotMode, updatesEnabled, gridApi, keyColumn, asyncTransactionWaitMillis, applyBatchedUpdates]);

  // Manual flush function
  const flushTransactions = useCallback(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    applyBatchedUpdates();

    // Also flush AG-Grid's internal async transactions
    if (gridApi && typeof gridApi.flushAsyncTransactions === 'function') {
      gridApi.flushAsyncTransactions();
    }
  }, [gridApi, applyBatchedUpdates]);

  // Get current metrics
  const getMetrics = useCallback((): UpdateMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  return {
    processUpdates,
    flushTransactions,
    getMetrics
  };
}