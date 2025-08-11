import { useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ProviderConfig } from '../types';
import { SharedWorkerClient } from '@/services/sharedWorker/SharedWorkerClient';

interface ConnectionManagementProps {
  providerConfig: ProviderConfig | null;
  workerClient: SharedWorkerClient | null;
  selectedProviderId: string | null;
  activeProfileData: { autoConnect?: boolean } | null;
  connectionState: {
    isConnected: boolean;
    isConnecting: boolean;
    wasManuallyDisconnected: boolean;
  };
  connect: (config: ProviderConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  resetSnapshot: () => void;
  requestSnapshot: (client: SharedWorkerClient, providerId: string) => Promise<void>;
  handleSnapshotData: (data: any[]) => void;
  handleRealtimeUpdate: (data: any[]) => void;
}

export function useConnectionManagement({
  providerConfig,
  workerClient,
  selectedProviderId,
  activeProfileData,
  connectionState,
  connect,
  disconnect,
  resetSnapshot,
  requestSnapshot,
  handleSnapshotData,
  handleRealtimeUpdate
}: ConnectionManagementProps) {
  const { toast } = useToast();
  const hasAutoConnected = useRef(false);
  
  // Connect to SharedWorker
  const connectToSharedWorker = useCallback(async () => {
    if (!providerConfig || !workerClient || !selectedProviderId) {
      console.error('No provider config loaded or SharedWorker not initialized');
      toast({
        title: "Configuration Missing",
        description: "Please select a datasource provider first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    const requiredFields: (keyof ProviderConfig)[] = ['websocketUrl', 'listenerTopic'];
    const missingFields = requiredFields.filter(field => !providerConfig[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      toast({
        title: "Invalid Configuration",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Reset state
      resetSnapshot();
      
      // Connect to provider through SharedWorker
      await connect(providerConfig);
      
      // Request snapshot explicitly
      await requestSnapshot(workerClient, selectedProviderId);
      
      // Request current status to sync UI state
      try {
        const status = await workerClient.getStatus(selectedProviderId);
        if (status) {
          // Status received - UI will update via state
        }
      } catch (error) {
        console.error('[ConnectionManagement] Failed to get status:', error);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect to SharedWorker',
        variant: "destructive"
      });
    }
  }, [providerConfig, workerClient, selectedProviderId, toast, connect, resetSnapshot, requestSnapshot]);
  
  // Disconnect from SharedWorker
  const disconnectFromSharedWorker = useCallback(async () => {
    if (workerClient && selectedProviderId) {
      try {
        await disconnect();
        resetSnapshot();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }, [workerClient, selectedProviderId, disconnect, resetSnapshot]);
  
  // Handle auto-connect when provider config is loaded
  useEffect(() => {
    if (!providerConfig || !selectedProviderId) {
      return;
    }
    
    // Auto-connect if profile has autoConnect enabled and we haven't already auto-connected
    // AND the user hasn't manually disconnected
    if (activeProfileData?.autoConnect && !hasAutoConnected.current && !connectionState.isConnected && !connectionState.wasManuallyDisconnected) {
      hasAutoConnected.current = true;
      
      // Small delay to ensure all state is settled
      const timer = setTimeout(() => {
        connectToSharedWorker();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [providerConfig, selectedProviderId, activeProfileData?.autoConnect, connectionState.isConnected, connectionState.wasManuallyDisconnected, connectToSharedWorker]);
  
  // Set up event listeners for SharedWorker messages
  useEffect(() => {
    if (!workerClient) return;
    
    const handleSnapshot = (data: { providerId: string; data: any[]; statistics?: any }) => {
      if (data.providerId === selectedProviderId) {
        handleSnapshotData(data.data);
      }
    };
    
    const handleUpdate = (data: { providerId: string; data: any[]; statistics?: any }) => {
      if (data.providerId === selectedProviderId) {
        handleRealtimeUpdate(data.data);
      }
    };
    
    const handleStatus = (data: { providerId: string; statistics: any }) => {
      if (data.providerId === selectedProviderId && data.statistics) {
        const wasConnected = connectionState.isConnected;
        
        // Check if we just disconnected from STOMP server
        if (wasConnected && !data.statistics.isConnected) {
          alert('STOMP provider has been disconnected from the server!');
          
          toast({
            title: "Connection Lost",
            description: "STOMP provider has been disconnected from the server",
            variant: "destructive",
          });
        }
      }
    };
    
    // Add event listeners
    workerClient.on('snapshot', handleSnapshot);
    workerClient.on('update', handleUpdate);
    workerClient.on('status', handleStatus);
    
    // Cleanup
    return () => {
      workerClient.removeListener('snapshot', handleSnapshot);
      workerClient.removeListener('update', handleUpdate);
      workerClient.removeListener('status', handleStatus);
    };
  }, [selectedProviderId, workerClient, connectionState.isConnected, toast, handleSnapshotData, handleRealtimeUpdate]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerClient && selectedProviderId) {
        disconnect().catch(() => {});
      }
    };
  }, [workerClient, selectedProviderId, disconnect]);
  
  // Reset auto-connect flag when provider changes
  const handleProviderChange = useCallback((providerId: string | null) => {
    hasAutoConnected.current = false;
    return providerId;
  }, []);
  
  return {
    connectToSharedWorker,
    disconnectFromSharedWorker,
    handleProviderChange
  };
}