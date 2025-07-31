import { useState, useRef, useCallback, useEffect } from 'react';
import { SharedWorkerClient } from '@/services/sharedWorker/SharedWorkerClient';
import { useToast } from '@/hooks/use-toast';
import { RowData, SnapshotMode, SnapshotData } from '../types';
import { SNAPSHOT_MODES } from '../config/constants';

interface UseSnapshotDataResult {
  snapshotData: SnapshotData;
  handleSnapshotData: (data: any[]) => void;
  handleRealtimeUpdate: (updates: any[]) => void;
  resetSnapshot: () => void;
  requestSnapshot: (workerClient: SharedWorkerClient, providerId: string) => Promise<void>;
}

export function useSnapshotData(
  gridApiRef: React.MutableRefObject<any>
): UseSnapshotDataResult {
  const { toast } = useToast();
  
  // UI state only for critical updates
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode>(SNAPSHOT_MODES.IDLE);
  const [rowData, setRowData] = useState<RowData[]>([]);
  
  // Refs for data accumulation (prevents re-renders)
  const snapshotDataRef = useRef<RowData[]>([]);
  const isSnapshotCompleteRef = useRef(false);
  const messageCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  
  // Update message count in AG-Grid context
  const updateMessageCountInGrid = useCallback((count: number, forceUpdate = false) => {
    const now = Date.now();
    // Batch updates - only update every 100ms unless forced
    if (!forceUpdate && now - lastUpdateTimeRef.current < 100) {
      return;
    }
    lastUpdateTimeRef.current = now;
    
    if (gridApiRef.current && gridApiRef.current.getContext) {
      try {
        const context = gridApiRef.current.getContext();
        gridApiRef.current.updateContext({
          ...context,
          snapshotData: {
            mode: snapshotMode,
            messageCount: count,
            isComplete: isSnapshotCompleteRef.current
          }
        });
        // Refresh status bar to update the connection panel
        gridApiRef.current.refreshHeader();
      } catch (error) {
        console.warn('[useSnapshotData] Grid API not ready yet:', error);
      }
    }
  }, [snapshotMode]);
  
  // Handle snapshot data accumulation
  const handleSnapshotData = useCallback((data: any[]) => {
    if (!isSnapshotCompleteRef.current) {
      // During snapshot - accumulate data in ref
      snapshotDataRef.current.push(...data);
      messageCountRef.current += data.length;
      updateMessageCountInGrid(messageCountRef.current);
      
      // Update mode to receiving if not already
      setSnapshotMode((prev) => prev === SNAPSHOT_MODES.REQUESTING ? SNAPSHOT_MODES.RECEIVING : prev);
    }
  }, [updateMessageCountInGrid]);
  
  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((updates: any[]) => {
    if (!gridApiRef.current || updates.length === 0) return;
    
    // If we're still in snapshot mode, treat as snapshot data
    if (!isSnapshotCompleteRef.current) {
      handleSnapshotData(updates);
      return;
    }
    
    // Real-time updates - direct to grid API
    if (gridApiRef.current) {
      gridApiRef.current.applyTransactionAsync({ update: updates });
    }
    messageCountRef.current += updates.length;
    
    // Update grid context with batched message count
    updateMessageCountInGrid(messageCountRef.current);
  }, [handleSnapshotData, updateMessageCountInGrid]);
  
  // Complete snapshot and set all data at once
  const completeSnapshot = useCallback(() => {
    if (snapshotDataRef.current.length > 0 && !isSnapshotCompleteRef.current) {
      console.log(`[useSnapshotData] Setting snapshot data: ${snapshotDataRef.current.length} rows`);
      setRowData(snapshotDataRef.current);
      isSnapshotCompleteRef.current = true;
      setSnapshotMode(SNAPSHOT_MODES.COMPLETE);
      toast({
        title: "Snapshot Complete",
        description: `Loaded ${snapshotDataRef.current.length} rows`,
      });
    }
  }, [toast]);
  
  // Reset snapshot state
  const resetSnapshot = useCallback(() => {
    setSnapshotMode(SNAPSHOT_MODES.IDLE);
    setRowData([]);
    snapshotDataRef.current = [];
    isSnapshotCompleteRef.current = false;
    messageCountRef.current = 0;
    lastUpdateTimeRef.current = 0;
    updateMessageCountInGrid(0, true); // Force update on reset
  }, [updateMessageCountInGrid]);
  
  // Request snapshot from SharedWorker
  const requestSnapshot = useCallback(async (workerClient: SharedWorkerClient, providerId: string) => {
    console.log('[useSnapshotData] Requesting snapshot from SharedWorker');
    setSnapshotMode(SNAPSHOT_MODES.REQUESTING);
    
    try {
      const snapshot = await workerClient.getSnapshot(providerId);
      if (snapshot && snapshot.length > 0) {
        console.log(`[useSnapshotData] Received snapshot from SharedWorker: ${snapshot.length} rows`);
        handleSnapshotData(snapshot);
        
        // Mark snapshot as complete after receiving cached data
        snapshotDataRef.current = snapshot;
        setRowData(snapshot);
        isSnapshotCompleteRef.current = true;
        setSnapshotMode(SNAPSHOT_MODES.COMPLETE);
        messageCountRef.current = snapshot.length;
        updateMessageCountInGrid(snapshot.length, true); // Force update
        
        toast({
          title: "Snapshot Loaded",
          description: `Loaded ${snapshot.length} cached rows from SharedWorker`,
        });
      } else {
        console.log('[useSnapshotData] No cached snapshot available, waiting for live data');
        // Keep showing the busy indicator since snapshot is still being loaded
      }
    } catch (error) {
      console.error('[useSnapshotData] Failed to get snapshot:', error);
      setSnapshotMode(SNAPSHOT_MODES.IDLE);
      toast({
        title: "Snapshot Error",
        description: "Failed to load snapshot data. Please try again.",
        variant: "destructive",
      });
    }
  }, [handleSnapshotData, toast]);
  
  // Effect to handle mode transitions
  useEffect(() => {
    // When mode changes to complete, ensure data is set
    if (snapshotMode === SNAPSHOT_MODES.COMPLETE && !isSnapshotCompleteRef.current) {
      completeSnapshot();
    }
  }, [snapshotMode, completeSnapshot]);
  
  // Update grid context when mode changes
  useEffect(() => {
    updateMessageCountInGrid(messageCountRef.current, true);
  }, [snapshotMode, updateMessageCountInGrid]);
  
  return {
    snapshotData: {
      mode: snapshotMode,
      data: rowData,
      messageCount: messageCountRef.current,
      isComplete: isSnapshotCompleteRef.current
    },
    handleSnapshotData,
    handleRealtimeUpdate,
    resetSnapshot,
    requestSnapshot
  };
}