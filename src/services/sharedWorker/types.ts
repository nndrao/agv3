// SharedWorkerClient types
import { EventEmitter } from 'events';

export interface SharedWorkerClientConfig {
  workerUrl?: string;
  reconnectInterval?: number;
  requestTimeout?: number;
}

export interface SharedWorkerClientEvents {
  connected: void;
  disconnected: void;
  error: Error;
  snapshot: { providerId: string; data: any[]; statistics?: any };
  update: { providerId: string; data: any[]; statistics?: any };
  status: { providerId: string; statistics: any };
}

export interface PendingRequest {
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export abstract class SharedWorkerClientBase extends EventEmitter {
  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract subscribe(providerId: string, config?: any): Promise<void>;
  abstract unsubscribe(providerId: string): Promise<void>;
  abstract getSnapshot(providerId: string): Promise<any[]>;
  abstract getStatus(providerId: string): Promise<any>;
  abstract isConnected(): boolean;
}