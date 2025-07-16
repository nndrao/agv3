export class ChannelClient {
  private client: any = null;
  private channelName: string;
  private listeners: Map<string, Function> = new Map();
  
  constructor(channelName: string) {
    this.channelName = channelName;
  }
  
  async connect(): Promise<void> {
    try {
      this.client = await fin.InterApplicationBus.Channel.connect(this.channelName);
      console.log(`Connected to channel: ${this.channelName}`);
    } catch (error) {
      console.error(`Failed to connect to channel ${this.channelName}:`, error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      // Unregister all listeners
      this.listeners.forEach((listener, topic) => {
        this.client!.unregister(topic, listener as any);
      });
      this.listeners.clear();
      
      await this.client.disconnect();
      this.client = null;
      console.log(`Disconnected from channel: ${this.channelName}`);
    }
  }
  
  async send(topic: string, payload: any): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to channel');
    }
    
    try {
      return await this.client.dispatch(topic, payload);
    } catch (error) {
      console.error(`Failed to send ${topic} to ${this.channelName}:`, error);
      throw error;
    }
  }
  
  on(topic: string, handler: (payload: any) => void): () => void {
    if (!this.client) {
      throw new Error('Not connected to channel');
    }
    
    const listener = (payload: any) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error handling ${topic} from ${this.channelName}:`, error);
      }
    };
    
    this.client.register(topic, listener);
    this.listeners.set(topic, listener);
    
    // Return unsubscribe function
    return () => {
      if (this.client && this.listeners.has(topic)) {
        this.client.unregister(topic, listener);
        this.listeners.delete(topic);
      }
    };
  }
  
  isConnected(): boolean {
    return this.client !== null;
  }
}