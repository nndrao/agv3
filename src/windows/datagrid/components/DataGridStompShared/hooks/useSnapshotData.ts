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
  const snapshotModeRef = useRef<SnapshotMode>(SNAPSHOT_MODES.IDLE);
  
  // Update message count in AG-Grid context only (no React state)
  const updateMessageCountInGrid = useCallback((count: number, forceUpdate = false) => {
    const now = Date.now();
    // Batch updates - only update every 100ms unless forced
    if (!forceUpdate && now - lastUpdateTimeRef.current < 100) {
      return;
    }
    lastUpdateTimeRef.current = now;
    
    
    // Update ref only (no re-renders)
    messageCountRef.current = count;
    
    
    if (gridApiRef.current) {
      try {
        // AG-Grid v31+ doesn't have getContext/updateContext
        // We need to use the context property or refresh with new params
        
        // Store the data in a way the status panel can access it
        if (!gridApiRef.current._customContext) {
          gridApiRef.current._customContext = {};
        }
        
        gridApiRef.current._customContext.snapshotData = {
          mode: snapshotModeRef.current,
          messageCount: count,
          isComplete: isSnapshotCompleteRef.current
        };
        
        
        // Dispatch custom event to update status bar
        if (typeof gridApiRef.current.dispatchEvent === 'function') {
          gridApiRef.current.dispatchEvent({ type: 'statusBarUpdate' });
        } else {
        }
      } catch (error) {
      }
    } else {
    }
  }, []); // Remove dependency to avoid stale closures
  
  // Handle snapshot data accumulation
  const handleSnapshotData = useCallback((data: any[]) => {
    if (!isSnapshotCompleteRef.current) {
      // During snapshot - accumulate data in ref
      snapshotDataRef.current.push(...data);
      const newCount = messageCountRef.current + data.length;
      updateMessageCountInGrid(newCount);
      
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
    
    // Update message count - force update for real-time messages
    const newCount = messageCountRef.current + updates.length;
    updateMessageCountInGrid(newCount, true); // Force update to bypass throttling
  }, [handleSnapshotData, updateMessageCountInGrid]);
  
  // Complete snapshot and set all data at once
  const completeSnapshot = useCallback(() => {
    if (snapshotDataRef.current.length > 0 && !isSnapshotCompleteRef.current) {
      setRowData(snapshotDataRef.current);
      isSnapshotCompleteRef.current = true;
      setSnapshotMode(SNAPSHOT_MODES.COMPLETE);
      snapshotModeRef.current = SNAPSHOT_MODES.COMPLETE;
      toast({
        title: "Snapshot Complete",
        description: `Loaded ${snapshotDataRef.current.length} rows`,
      });
    }
  }, [toast]);
  
  // Reset snapshot state
  const resetSnapshot = useCallback(() => {
    setSnapshotMode(SNAPSHOT_MODES.IDLE);
    snapshotModeRef.current = SNAPSHOT_MODES.IDLE;
    setRowData([]);
    snapshotDataRef.current = [];
    isSnapshotCompleteRef.current = false;
    messageCountRef.current = 0;
    lastUpdateTimeRef.current = 0;
    updateMessageCountInGrid(0, true); // Force update on reset
  }, [updateMessageCountInGrid]);
  
  // Request snapshot from SharedWorker
  const requestSnapshot = useCallback(async (workerClient: SharedWorkerClient, providerId: string) => {
    setSnapshotMode(SNAPSHOT_MODES.REQUESTING);
    
    try {
      const snapshot = await workerClient.getSnapshot(providerId);
      if (snapshot && snapshot.length > 0) {
        handleSnapshotData(snapshot);
        
        // Mark snapshot as complete after receiving cached data
        snapshotDataRef.current = snapshot;
        setRowData(snapshot);
        isSnapshotCompleteRef.current = true;
        setSnapshotMode(SNAPSHOT_MODES.COMPLETE);
        updateMessageCountInGrid(snapshot.length, true); // Force update
        
        toast({
          title: "Snapshot Loaded",
          description: `Loaded ${snapshot.length} cached rows from SharedWorker`,
        });
      } else {
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
  
  // Keep ref in sync with state
  useEffect(() => {
    snapshotModeRef.current = snapshotMode;
  }, [snapshotMode]);
  
  // Effect to handle mode transitions
  useEffect(() => {
    // When mode changes to complete, ensure data is set
    if (snapshotMode === SNAPSHOT_MODES.COMPLETE && !isSnapshotCompleteRef.current) {
      completeSnapshot();
    }
  }, [snapshotMode, completeSnapshot]);
  
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