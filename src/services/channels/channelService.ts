export class ChannelService {
  private static channels: Map<string, any> = new Map();
  
  static async initialize(): Promise<void> {
    console.log('Channel service initialized');
  }
  
  static async createChannel(channelName: string): Promise<any> {
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }
    
    try {
      const channel = await fin.InterApplicationBus.Channel.create(channelName);
      this.channels.set(channelName, channel);
      console.log(`Created channel: ${channelName}`);
      return channel;
    } catch (error) {
      console.error(`Failed to create channel ${channelName}:`, error);
      throw error;
    }
  }
  
  static async registerHandler(
    channelName: string, 
    topic: string, 
    handler: (payload: any) => Promise<any>
  ): Promise<void> {
    const channel = await this.getOrCreateChannel(channelName);
    
    channel.register(topic, async (payload: any) => {
      try {
        return await handler(payload);
      } catch (error) {
        console.error(`Error handling ${topic} on ${channelName}:`, error);
        throw error;
      }
    });
    
    console.log(`Registered handler for ${topic} on ${channelName}`);
  }
  
  static async broadcast(channelName: string, topic: string, payload: any): Promise<void> {
    const channel = await this.getOrCreateChannel(channelName);
    
    try {
      await channel.publish(topic, payload);
    } catch (error) {
      console.error(`Failed to broadcast ${topic} on ${channelName}:`, error);
      throw error;
    }
  }
  
  static async destroyChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      await channel.destroy();
      this.channels.delete(channelName);
      console.log(`Destroyed channel: ${channelName}`);
    }
  }
  
  private static async getOrCreateChannel(channelName: string): Promise<any> {
    if (!this.channels.has(channelName)) {
      return await this.createChannel(channelName);
    }
    return this.channels.get(channelName)!;
  }
}