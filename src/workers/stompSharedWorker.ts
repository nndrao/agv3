/// <reference lib="webworker" />

import { 
  WorkerRequest, 
  WorkerResponse, 
  ProviderConnection
} from '../types/sharedWorker';

// Import StompClient dynamically to avoid module issues in worker
let StompClient: typeof import('../services/stomp/StompClient').StompClient;

// Track all provider connections
const providers = new Map<string, ProviderConnection>();

// Track port connections
const ports = new Map<string, MessagePort>();

// Generate unique port IDs
let portCounter = 0;
const generatePortId = () => `port-${Date.now()}-${++portCounter}`;

// Send response to specific port
function sendToPort(port: MessagePort, response: WorkerResponse) {
  try {
    port.postMessage(response);
  } catch (error) {
    console.error('[SharedWorker] Error sending to port:', error);
  }
}

// Broadcast to all subscribers of a provider
function broadcastToSubscribers(providerId: string, response: WorkerResponse) {
  const provider = providers.get(providerId);
  if (!provider) return;

  provider.subscribers.forEach((port, portId) => {
    try {
      port.postMessage(response);
    } catch (error) {
      console.error(`[SharedWorker] Error broadcasting to port ${portId}:`, error);
      // Remove dead port
      provider.subscribers.delete(portId);
      ports.delete(portId);
    }
  });
}

// Apply updates to snapshot cache
function applyUpdatesToSnapshot(provider: ProviderConnection, updates: Record<string, unknown>[]) {
  const keyColumn = provider.config.keyColumn;
  if (!keyColumn) {
    console.warn(`[SharedWorker] No keyColumn defined for provider ${provider.providerId}, cannot cache snapshot`);
    return;
  }

  let addedCount = 0;
  updates.forEach(update => {
    const key = update[keyColumn];
    if (key !== undefined && key !== null) {
      provider.snapshot.set(String(key), update);
      addedCount++;
    }
  });
  
  provider.lastUpdate = Date.now();
  console.log(`[SharedWorker] Applied ${addedCount} updates to snapshot cache for provider ${provider.providerId}. Total cached: ${provider.snapshot.size}`);
}

// Create provider connection
async function createProviderConnection(providerId: string, config: Record<string, unknown>): Promise<ProviderConnection> {
  console.log(`[SharedWorker] Creating provider connection for ${providerId}`);
  
  // Dynamically import StompClient
  if (!StompClient) {
    const module = await import('../services/stomp/StompClient');
    StompClient = module.StompClient;
  }

  const provider: ProviderConnection = {
    providerId,
    config,
    snapshot: new Map(),
    lastUpdate: Date.now(),
    subscribers: new Map(),
    connection: null,
    statistics: {
      snapshotRowsReceived: 0,
      updateRowsReceived: 0,
      connectionCount: 0,
      disconnectionCount: 0,
      isConnected: false,
      bytesReceived: 0,
      snapshotBytesReceived: 0,
      updateBytesReceived: 0,
      mode: 'idle'
    },
    isConnecting: false,
    isSnapshotComplete: false,
    pendingSnapshotRequests: []
  };

  providers.set(providerId, provider);
  return provider;
}

// Connect to STOMP provider
async function connectProvider(provider: ProviderConnection) {
  if (provider.isConnecting || (provider.connection && provider.statistics.isConnected)) {
    return;
  }

  provider.isConnecting = true;

  try {
    console.log(`[SharedWorker] Connecting to provider ${provider.providerId}`);
    
    // Create StompClient configuration
    // Extract dataType from listenerTopic if not provided
    let dataType = provider.config.dataType;
    if (!dataType && provider.config.listenerTopic) {
      // Extract from pattern like /snapshot/positions/{clientId}
      const match = provider.config.listenerTopic.match(/\/snapshot\/(\w+)\//);
      if (match) {
        dataType = match[1];
      }
    }
    
    const clientConfig = {
      websocketUrl: provider.config.websocketUrl,
      dataType: dataType || 'positions',
      messageRate: parseInt(provider.config.messageRate) || 1000,
      batchSize: provider.config.batchSize ? parseInt(provider.config.batchSize) : undefined,
      snapshotEndToken: provider.config.snapshotEndToken,
      keyColumn: provider.config.keyColumn,
      snapshotTimeoutMs: provider.config.snapshotTimeoutMs || 30000
    };
    
    const connection = new StompClient(clientConfig);
    provider.connection = connection;

    // Track if we're in snapshot mode
    let isSnapshotMode = true;

    // Listen for lifecycle events
    connection.on('connected', ({ clientId }: { clientId: string }) => {
      console.log(`[SharedWorker] Provider ${provider.providerId} connected with clientId: ${clientId}`);
      provider.statistics.isConnected = true;
      provider.statistics.connectionCount++;
      provider.statistics.mode = 'snapshot';
      provider.isConnecting = false;
      
      broadcastToSubscribers(provider.providerId, {
        type: 'status',
        providerId: provider.providerId,
        statistics: provider.statistics,
        timestamp: Date.now()
      });
    });

    connection.on('disconnected', () => {
      console.log(`[SharedWorker] Provider ${provider.providerId} disconnected`);
      provider.statistics.isConnected = false;
      provider.statistics.disconnectionCount++;
      provider.isSnapshotComplete = false;
      
      broadcastToSubscribers(provider.providerId, {
        type: 'status',
        providerId: provider.providerId,
        statistics: provider.statistics,
        timestamp: Date.now()
      });
    });

    connection.on('error', (error: Error) => {
      console.error(`[SharedWorker] Provider ${provider.providerId} error:`, error);
      provider.error = error.message;
      provider.isConnecting = false;
      
      broadcastToSubscribers(provider.providerId, {
        type: 'error',
        providerId: provider.providerId,
        error: error.message,
        timestamp: Date.now()
      });
    });

    connection.on('data', (data: Record<string, unknown>[]) => {
      console.log(`[SharedWorker] Provider ${provider.providerId} received ${data.length} rows (mode: ${isSnapshotMode ? 'snapshot' : 'realtime'})`);
      
      // Log first item to verify structure
      if (data.length > 0) {
        console.log(`[SharedWorker] First item keys:`, Object.keys(data[0]));
        console.log(`[SharedWorker] Key column: ${provider.config.keyColumn}`);
      }
      
      // Apply data to snapshot
      applyUpdatesToSnapshot(provider, data);
      
      if (isSnapshotMode) {
        // During snapshot mode, broadcast as snapshot data
        provider.statistics.snapshotRowsReceived += data.length;
        provider.statistics.snapshotBytesReceived += JSON.stringify(data).length;
        
        broadcastToSubscribers(provider.providerId, {
          type: 'snapshot',
          providerId: provider.providerId,
          data: data,
          statistics: provider.statistics,
          timestamp: Date.now()
        });
      } else {
        // After snapshot, broadcast as updates
        provider.statistics.updateRowsReceived += data.length;
        provider.statistics.updateBytesReceived += JSON.stringify(data).length;
        
        broadcastToSubscribers(provider.providerId, {
          type: 'update',
          providerId: provider.providerId,
          data: data,
          statistics: provider.statistics,
          timestamp: Date.now()
        });
      }
    });

    connection.on('snapshot-complete', ({ rowCount, duration }: { rowCount: number; duration: number }) => {
      console.log(`[SharedWorker] Provider ${provider.providerId} snapshot complete: ${rowCount} rows in ${duration}ms`);
      isSnapshotMode = false;
      provider.statistics.mode = 'realtime';
      provider.statistics.snapshotRowsReceived = rowCount;
      provider.isSnapshotComplete = true;
      
      // Process any pending snapshot requests
      if (provider.pendingSnapshotRequests.length > 0) {
        console.log(`[SharedWorker] Processing ${provider.pendingSnapshotRequests.length} pending snapshot requests`);
        const snapshotData = Array.from(provider.snapshot.values());
        
        provider.pendingSnapshotRequests.forEach(({ port, request }) => {
          sendToPort(port, {
            type: 'snapshot',
            providerId: provider.providerId,
            requestId: request.requestId,
            data: snapshotData,
            statistics: provider.statistics,
            timestamp: Date.now()
          });
        });
        
        // Clear pending requests
        provider.pendingSnapshotRequests = [];
      }
      
      broadcastToSubscribers(provider.providerId, {
        type: 'status',
        providerId: provider.providerId,
        statistics: provider.statistics,
        timestamp: Date.now()
      });
    });

    // Connect to STOMP server
    await connection.connect();
    
    // Now we need to send the trigger message if configured
    if (provider.config.listenerTopic && provider.config.requestMessage) {
      console.log(`[SharedWorker] Sending snapshot request for provider ${provider.providerId}`);
      // The StompClient handles snapshot request automatically in connect()
      // Just need to ensure we pass the right config
    }
    
    console.log(`[SharedWorker] Provider ${provider.providerId} connection successful`);

  } catch (error) {
    console.error(`[SharedWorker] Failed to connect provider ${provider.providerId}:`, error);
    provider.error = error instanceof Error ? error.message : String(error);
    provider.isConnecting = false;
    
    broadcastToSubscribers(provider.providerId, {
      type: 'error',
      providerId: provider.providerId,
      error: provider.error,
      timestamp: Date.now()
    });
  }
}

// Handle subscribe request
async function handleSubscribe(port: MessagePort, request: WorkerRequest) {
  const { providerId, config, portId, requestId } = request;
  
  if (!portId) {
    sendToPort(port, {
      type: 'error',
      providerId,
      requestId,
      error: 'Port ID is required',
      timestamp: Date.now()
    });
    return;
  }

  console.log(`[SharedWorker] Subscribe request from ${portId} for provider ${providerId}`);
  console.log(`[SharedWorker] Current providers:`, Array.from(providers.keys()));

  // Get or create provider
  let provider = providers.get(providerId);
  console.log(`[SharedWorker] Provider lookup result:`, provider ? 'found' : 'not found');
  
  if (!provider) {
    if (!config) {
      sendToPort(port, {
        type: 'error',
        providerId,
        requestId,
        error: 'Configuration required for new provider',
        timestamp: Date.now()
      });
      return;
    }
    provider = await createProviderConnection(providerId, config);
  }

  // Add subscriber
  provider.subscribers.set(portId, port);
  ports.set(portId, port);

  // Log snapshot cache status but don't send automatically
  console.log(`[SharedWorker] Provider ${providerId} has ${provider.snapshot.size} cached items`);
  
  // Subscribers will explicitly request snapshot using getSnapshot

  // Send subscription confirmation
  sendToPort(port, {
    type: 'subscribed',
    providerId,
    requestId,
    statistics: provider.statistics,
    timestamp: Date.now()
  });

  // Connect if not connected
  if (!provider.statistics.isConnected && !provider.isConnecting) {
    await connectProvider(provider);
  }
}

// Handle unsubscribe request
function handleUnsubscribe(port: MessagePort, request: WorkerRequest) {
  const { providerId, portId, requestId } = request;
  
  if (!portId) {
    sendToPort(port, {
      type: 'error',
      providerId,
      requestId,
      error: 'Port ID is required',
      timestamp: Date.now()
    });
    return;
  }

  console.log(`[SharedWorker] Unsubscribe request from ${portId} for provider ${providerId}`);

  const provider = providers.get(providerId);
  if (provider) {
    provider.subscribers.delete(portId);
    
    // If no more subscribers, disconnect provider
    if (provider.subscribers.size === 0) {
      console.log(`[SharedWorker] No more subscribers for ${providerId}, disconnecting`);
      if (provider.connection) {
        provider.connection.disconnect();
      }
      providers.delete(providerId);
    }
  }

  ports.delete(portId);
  
  // Send unsubscribe confirmation
  sendToPort(port, {
    type: 'unsubscribed',
    providerId,
    requestId,
    timestamp: Date.now()
  });
}

// Handle get snapshot request
function handleGetSnapshot(port: MessagePort, request: WorkerRequest) {
  const { providerId, requestId } = request;
  
  console.log(`[SharedWorker] GetSnapshot request for provider ${providerId}`);
  
  const provider = providers.get(providerId);
  if (!provider) {
    console.log(`[SharedWorker] Provider ${providerId} not found`);
    sendToPort(port, {
      type: 'error',
      providerId,
      requestId,
      error: 'Provider not found',
      timestamp: Date.now()
    });
    return;
  }

  // Check if snapshot is complete
  if (!provider.isSnapshotComplete) {
    console.log(`[SharedWorker] Snapshot not complete for provider ${providerId}, queuing request`);
    provider.pendingSnapshotRequests.push({ port, request });
    return;
  }

  const snapshotData = Array.from(provider.snapshot.values());
  console.log(`[SharedWorker] Sending complete snapshot for provider ${providerId}: ${snapshotData.length} rows`);
  
  sendToPort(port, {
    type: 'snapshot',
    providerId,
    requestId,
    data: snapshotData,
    statistics: provider.statistics,
    timestamp: Date.now()
  });
}

// Handle get status request
function handleGetStatus(port: MessagePort, request: WorkerRequest) {
  const { providerId, requestId } = request;
  
  const provider = providers.get(providerId);
  if (!provider) {
    sendToPort(port, {
      type: 'error',
      providerId,
      requestId,
      error: 'Provider not found',
      timestamp: Date.now()
    });
    return;
  }

  sendToPort(port, {
    type: 'status',
    providerId,
    requestId,
    statistics: provider.statistics,
    timestamp: Date.now()
  });
}

// Handle new connection
(self as any).onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  const portId = generatePortId();
  
  console.log(`[SharedWorker] New connection: ${portId}`);
  
  port.addEventListener('message', async (messageEvent: MessageEvent<WorkerRequest>) => {
    const request = messageEvent.data;
    
    // Add portId to request if not present
    if (!request.portId) {
      request.portId = portId;
    }

    try {
      switch (request.type) {
        case 'subscribe':
          await handleSubscribe(port, request);
          break;
          
        case 'unsubscribe':
          handleUnsubscribe(port, request);
          break;
          
        case 'getSnapshot':
          handleGetSnapshot(port, request);
          break;
          
        case 'getStatus':
          handleGetStatus(port, request);
          break;
          
        default:
          sendToPort(port, {
            type: 'error',
            providerId: request.providerId,
            requestId: request.requestId,
            error: `Unknown request type: ${request.type}`,
            timestamp: Date.now()
          });
      }
    } catch (error) {
      console.error('[SharedWorker] Error handling request:', error);
      sendToPort(port, {
        type: 'error',
        providerId: request.providerId,
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  });

  port.addEventListener('messageerror', (error) => {
    console.error(`[SharedWorker] Message error on port ${portId}:`, error);
  });

  // Handle port close
  port.addEventListener('close', () => {
    console.log(`[SharedWorker] Port closed: ${portId}`);
    
    // Remove port from all provider subscribers
    providers.forEach(provider => {
      provider.subscribers.delete(portId);
    });
    
    ports.delete(portId);
  });

  port.start();
};

// Log worker startup
console.log('[SharedWorker] STOMP SharedWorker started');