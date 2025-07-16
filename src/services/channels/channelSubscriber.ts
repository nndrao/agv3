import { EventEmitter } from 'events';
import { ChannelClient } from './channelClient';

export class ChannelSubscriber extends EventEmitter {
  private client: ChannelClient;
  private channelName: string;
  private subscriptions: Map<string, () => void> = new Map();
  
  constructor(channelName: string) {
    super();
    this.channelName = channelName;
    this.client = new ChannelClient(channelName);
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
    console.log(`Channel subscriber connected: ${this.channelName}`);
  }
  
  async disconnect(): Promise<void> {
    // Unsubscribe from all topics
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    
    await this.client.disconnect();
    console.log(`Channel subscriber disconnected: ${this.channelName}`);
  }
  
  subscribe(topic: string): void {
    if (this.subscriptions.has(topic)) {
      console.warn(`Already subscribed to ${topic} on ${this.channelName}`);
      return;
    }
    
    const unsubscribe = this.client.on(topic, (payload) => {
      console.log(`[ChannelSubscriber] Received ${topic} event, payload size:`, 
        payload?.updates ? payload.updates.length : 'N/A');
      this.emit(topic, payload);
    });
    
    this.subscriptions.set(topic, unsubscribe);
    console.log(`Subscribed to ${topic} on ${this.channelName}`);
  }
  
  unsubscribe(topic: string): void {
    const unsubscribe = this.subscriptions.get(topic);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(topic);
      console.log(`Unsubscribed from ${topic} on ${this.channelName}`);
    }
  }
  
  async request(topic: string, payload?: any): Promise<any> {
    return await this.client.send(topic, payload);
  }
  
  isConnected(): boolean {
    return this.client.isConnected();
  }
}