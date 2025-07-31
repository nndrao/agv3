import { EventEmitter } from 'events';
import { ChannelClient } from './channelClient';

export class ChannelSubscriber extends EventEmitter {
  private client: ChannelClient;
  private subscriptions: Map<string, () => void> = new Map();
  
  constructor(channelName: string) {
    super();
    this.client = new ChannelClient(channelName);
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
  }
  
  async disconnect(): Promise<void> {
    // Unsubscribe from all topics
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    
    await this.client.disconnect();
  }
  
  subscribe(topic: string): void {
    if (this.subscriptions.has(topic)) {
      return;
    }
    
    const unsubscribe = this.client.on(topic, (payload) => {
      this.emit(topic, payload);
    });
    
    this.subscriptions.set(topic, unsubscribe);
  }
  
  unsubscribe(topic: string): void {
    const unsubscribe = this.subscriptions.get(topic);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(topic);
    }
  }
  
  async request(topic: string, payload?: any): Promise<any> {
    return await this.client.send(topic, payload);
  }
  
  isConnected(): boolean {
    return this.client.isConnected();
  }
}