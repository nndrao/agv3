// SharedWorker types for STOMP data management

import { StompStatistics } from '../providers/StompDatasourceProvider';

// Client -> Worker message types
export type WorkerRequestType = 'subscribe' | 'unsubscribe' | 'getSnapshot' | 'getStatus' | 'configure';

export interface WorkerRequest {
  type: WorkerRequestType;
  providerId: string;
  requestId: string;
  config?: any; // Provider configuration for 'configure' requests
  portId?: string; // Unique identifier for the port/client
}

// Worker -> Client message types
export type WorkerResponseType = 'snapshot' | 'update' | 'status' | 'error' | 'subscribed' | 'unsubscribed';

export interface WorkerResponse {
  type: WorkerResponseType;
  providerId: string;
  requestId?: string;
  data?: any[];
  statistics?: StompStatistics;
  error?: string;
  timestamp?: number;
}

// Provider connection state
export interface ProviderState {
  providerId: string;
  connected: boolean;
  connecting: boolean;
  error?: string;
  statistics: StompStatistics;
  subscriberCount: number;
  lastUpdate?: number;
}

// Snapshot update for real-time data
export interface SnapshotUpdate {
  type: 'add' | 'update' | 'remove';
  data: any[];
  keyColumn: string;
}

// Worker internal types
export interface ProviderConnection {
  providerId: string;
  config: any;
  snapshot: Map<string, any>; // Keyed by row ID
  lastUpdate: number;
  subscribers: Map<string, MessagePort>; // portId -> MessagePort
  connection: any; // StompDatasourceProvider instance
  statistics: StompStatistics;
  isConnecting: boolean;
  error?: string;
}

// Subscription info
export interface Subscription {
  portId: string;
  providerId: string;
  port: MessagePort;
  subscriptionTime: number;
}