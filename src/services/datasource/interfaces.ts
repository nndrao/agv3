export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
export type DataSourceMode = 'idle' | 'snapshot' | 'realtime';
export type ProviderType = 'stomp' | 'websocket' | 'rest' | 'socketio' | 'variables';

export interface DataMetadata {
  isSnapshot: boolean;
  batchNumber?: number;
  isFirstBatch?: boolean;
  totalRows?: number;
  sequence?: number;
  timestamp?: number;
}

export interface SnapshotStats {
  rowCount: number;
  duration: number;
  completedAt: number;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: ProviderType;
  keyColumn: string;
  [key: string]: any;
}

export interface IDataSourceClient {
  // Properties
  readonly type: ProviderType;
  readonly keyColumn: string;
  readonly isConnected: boolean;
  readonly mode: DataSourceMode;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  refresh(): Promise<void>;
  
  // Event handlers
  onData(handler: (data: any[], metadata: DataMetadata) => void): () => void;
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void;
  onSnapshotComplete(handler: (stats: SnapshotStats) => void): () => void;
  onError(handler: (error: Error) => void): () => void;
  
  // Optional statistics
  getStatistics?(): any;
}

export interface IDataSourceProvider {
  // Properties
  readonly id: string;
  readonly type: ProviderType;
  readonly mode: DataSourceMode;
  
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Operations
  requestSnapshot(): Promise<void>;
  refresh(): Promise<void>;
  
  // Cache management
  getCachedData(): any[];
  getCacheSize(): number;
}

export interface DataMessage {
  sequence: number;
  data: any[];
  metadata: DataMetadata;
  timestamp: number;
  attempts: number;
}