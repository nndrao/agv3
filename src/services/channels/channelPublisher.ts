export class ChannelPublisher {
  private channel: any = null;
  private channelName: string;
  private handlers: Map<string, Function> = new Map();
  
  constructor(channelName: string) {
    this.channelName = channelName;
  }
  
  async initialize(): Promise<void> {
    try {
      this.channel = await fin.InterApplicationBus.Channel.create(this.channelName);
      console.log(`Channel publisher created: ${this.channelName}`);
    } catch (error) {
      console.error(`Failed to create channel publisher ${this.channelName}:`, error);
      throw error;
    }
  }
  
  async destroy(): Promise<void> {
    if (this.channel) {
      await this.channel.destroy();
      this.channel = null;
      this.handlers.clear();
      console.log(`Channel publisher destroyed: ${this.channelName}`);
    }
  }
  
  async publish(topic: string, payload: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    
    try {
      console.log(`[ChannelPublisher] Publishing ${topic} to ${this.channelName}, payload size:`, 
        payload.updates ? payload.updates.length : 'N/A');
      await this.channel.publish(topic, payload);
    } catch (error) {
      console.error(`Failed to publish ${topic} to ${this.channelName}:`, error);
      throw error;
    }
  }
  
  registerHandler(topic: string, handler: (payload: any) => Promise<any>): void {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    
    const wrappedHandler = async (payload: any) => {
      try {
        return await handler(payload);
      } catch (error) {
        console.error(`Error handling ${topic} on ${this.channelName}:`, error);
        throw error;
      }
    };
    
    this.channel.register(topic, wrappedHandler);
    this.handlers.set(topic, wrappedHandler);
    console.log(`Registered handler for ${topic} on ${this.channelName}`);
  }
  
  unregisterHandler(topic: string): void {
    if (this.channel && this.handlers.has(topic)) {
      const handler = this.handlers.get(topic)!;
      this.channel.unregister(topic, handler as any);
      this.handlers.delete(topic);
      console.log(`Unregistered handler for ${topic} on ${this.channelName}`);
    }
  }
  
  isInitialized(): boolean {
    return this.channel !== null;
  }
}