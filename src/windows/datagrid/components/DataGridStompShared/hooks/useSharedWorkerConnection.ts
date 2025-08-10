import { useState, useRef, useCallback, useEffect } from 'react';
import { SharedWorkerClient } from '@/services/sharedWorker/SharedWorkerClient';
import { useToast } from '@/hooks/use-toast';
import { ConnectionState, ProviderConfig } from '../types';
import { CONNECTION_TIMEOUTS } from '../config/constants';

interface UseSharedWorkerConnectionResult {
  connectionState: ConnectionState;
  workerClient: SharedWorkerClient | null;
  connect: (config: ProviderConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (providerId: string, config: ProviderConfig) => Promise<void>;
  unsubscribe: (providerId: string) => Promise<void>;
}

export function useSharedWorkerConnection(
  selectedProviderId: string | null,
  gridApiRef?: React.MutableRefObject<any>
): UseSharedWorkerConnectionResult {
  const { toast } = useToast();
  
  // State for UI updates (triggers re-renders)
  const [isConnected, setIsConnected] = useState(false);
  const [currentClientId, setCurrentClientId] = useState('');
  
  // Refs for internal logic (doesn't trigger re-renders)
  const sharedWorkerClientRef = useRef<SharedWorkerClient | null>(null);
  const isConnectingRef = useRef(false);
  const wasManuallyDisconnectedRef = useRef(false);
  const hasShownDisconnectAlertRef = useRef(false);
  
  // Update connection status in AG-Grid context and state
  const updateConnectionStatusInGrid = useCallback((connected: boolean, clientId: string = '') => {
    // Update state (triggers re-renders)
    setIsConnected(connected);
    setCurrentClientId(clientId);
    
    if (gridApiRef?.current) {
      try {
        // Store in custom context since AG-Grid v31+ doesn't have getContext/updateContext
        if (!gridApiRef.current._customContext) {
          gridApiRef.current._customContext = {};
        }
        
        gridApiRef.current._customContext.connectionState = {
          isConnected: connected,
          currentClientId: clientId,
          isConnecting: isConnectingRef.current,
          wasManuallyDisconnected: wasManuallyDisconnectedRef.current,
          hasShownDisconnectAlert: hasShownDisconnectAlertRef.current
        };
        
        // Dispatch custom event to update status bar
        if (typeof gridApiRef.current.dispatchEvent === 'function') {
          gridApiRef.current.dispatchEvent({ type: 'statusBarUpdate' });
        }
      } catch (error) {
        console.warn('[useSharedWorkerConnection] Grid API not ready yet:', error);
      }
    }
  }, [gridApiRef]);
  
  // Initialize SharedWorkerClient on mount
  useEffect(() => {
    const initializeWorkerClient = async () => {
      try {
        const client = new SharedWorkerClient({
          workerUrl: new URL('/src/workers/stompSharedWorker.ts', import.meta.url).href,
          reconnectInterval: CONNECTION_TIMEOUTS.RECONNECT,
          requestTimeout: CONNECTION_TIMEOUTS.REQUEST
        });
        
        // Set up event listeners before connecting
        client.on('connected', () => {
        });
        
        client.on('disconnected', () => {
          updateConnectionStatusInGrid(false, '');
        });
        
        client.on('error', (error: Error) => {
          console.error('[useSharedWorkerConnection] SharedWorker error:', error);
          
          // Check if this is a WebSocket connection error (STOMP disconnection)
          if (error.message && error.message.includes('WebSocket connection error')) {
            // Only show alert once per disconnection
            if (!hasShownDisconnectAlertRef.current && isConnected) {
              hasShownDisconnectAlertRef.current = true;
              alert('STOMP provider has been disconnected from the server!');
            }
            
            // Update connection state
            updateConnectionStatusInGrid(false, '');
          }
          
          toast({
            title: "SharedWorker Error",
            description: error.message,
            variant: "destructive",
          });
        });
        
        // Connect to SharedWorker
        await client.connect();
        sharedWorkerClientRef.current = client;
        
      } catch (error) {
        console.error('[useSharedWorkerConnection] Failed to initialize SharedWorkerClient:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to connect to SharedWorker",
          variant: "destructive",
        });
      }
    };
    
    initializeWorkerClient();
    
    return () => {
      // Cleanup on unmount
      if (sharedWorkerClientRef.current) {
        sharedWorkerClientRef.current.destroy();
        sharedWorkerClientRef.current = null;
      }
    };
  }, [toast, updateConnectionStatusInGrid]); // Include stable dependencies
  
  // Stable connect function
  const connect = useCallback(async (config: ProviderConfig) => {
    // Clear manual disconnect flag when user manually connects
    wasManuallyDisconnectedRef.current = false;
    // Reset the disconnect alert flag for new connection
    hasShownDisconnectAlertRef.current = false;
    
    // Prevent multiple simultaneous connections
    if (isConnected || isConnectingRef.current) {
      return;
    }
    
    if (!config || !sharedWorkerClientRef.current || !selectedProviderId) {
      console.error('No provider config loaded or SharedWorker not initialized');
      toast({
        title: "Configuration Missing",
        description: "Please select a datasource provider first",
        variant: "destructive"
      });
      return;
    }
    
    // Mark as connecting
    isConnectingRef.current = true;
    
    try {
      // Actually subscribe to the provider
      await sharedWorkerClientRef.current.subscribe(selectedProviderId, config);
      updateConnectionStatusInGrid(true, `shared-${selectedProviderId}`);
    } catch (error) {
      console.error('Connection error:', error);
      updateConnectionStatusInGrid(false, '');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect',
        variant: "destructive"
      });
    } finally {
      // Always clear connecting flag
      isConnectingRef.current = false;
    }
  }, [selectedProviderId, toast, updateConnectionStatusInGrid, isConnected]);
  
  // Stable disconnect function
  const disconnect = useCallback(async () => {
    if (sharedWorkerClientRef.current && selectedProviderId) {
      try {
        await sharedWorkerClientRef.current.unsubscribe(selectedProviderId);
        updateConnectionStatusInGrid(false, '');
        // Set flag to prevent auto-reconnect
        wasManuallyDisconnectedRef.current = true;
        isConnectingRef.current = false;
        toast({
          title: "Disconnected",
          description: "Disconnected from provider",
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }, [selectedProviderId, toast, updateConnectionStatusInGrid]);
  
  // Stable subscribe function
  const subscribe = useCallback(async (providerId: string, config: ProviderConfig) => {
    if (!sharedWorkerClientRef.current) {
      throw new Error('SharedWorker not initialized');
    }
    
    await sharedWorkerClientRef.current.subscribe(providerId, config);
    updateConnectionStatusInGrid(true, `shared-${providerId}`);
  }, [updateConnectionStatusInGrid]);
  
  // Stable unsubscribe function
  const unsubscribe = useCallback(async (providerId: string) => {
    if (!sharedWorkerClientRef.current) {
      return;
    }
    
    await sharedWorkerClientRef.current.unsubscribe(providerId);
    if (providerId === selectedProviderId) {
      updateConnectionStatusInGrid(false, '');
    }
  }, [selectedProviderId, updateConnectionStatusInGrid]);
  
  // Return stable connection state and functions
  return {
    connectionState: {
      isConnected: isConnected,
      currentClientId: currentClientId,
      isConnecting: isConnectingRef.current,
      wasManuallyDisconnected: wasManuallyDisconnectedRef.current,
      hasShownDisconnectAlert: hasShownDisconnectAlertRef.current
    },
    workerClient: sharedWorkerClientRef.current,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  };
}