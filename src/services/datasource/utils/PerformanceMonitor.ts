export class MovingAverage {
  private values: number[] = [];
  private sum: number = 0;
  private maxSize: number;
  
  constructor(size: number) {
    this.maxSize = size;
  }
  
  add(value: number): void {
    this.values.push(value);
    this.sum += value;
    
    if (this.values.length > this.maxSize) {
      this.sum -= this.values.shift()!;
    }
  }
  
  get average(): number {
    return this.values.length === 0 ? 0 : this.sum / this.values.length;
  }
  
  get count(): number {
    return this.values.length;
  }
  
  reset(): void {
    this.values = [];
    this.sum = 0;
  }
}

export class ThroughputCounter {
  private buckets: Map<number, number> = new Map();
  private bucketSize: number = 1000; // 1 second buckets
  
  record(count: number): void {
    const bucket = Math.floor(Date.now() / this.bucketSize);
    const current = this.buckets.get(bucket) || 0;
    this.buckets.set(bucket, current + count);
    
    // Clean old buckets (keep last 60 seconds)
    const cutoff = bucket - 60;
    for (const [key] of this.buckets) {
      if (key < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
  
  getThroughput(seconds: number = 1): number {
    const now = Math.floor(Date.now() / this.bucketSize);
    let total = 0;
    
    for (let i = 0; i < seconds; i++) {
      total += this.buckets.get(now - i) || 0;
    }
    
    return total / seconds;
  }
}

export interface PerformanceMetrics {
  messagesProcessed: number;
  processingTime: MovingAverage;
  queueDepth: MovingAverage;
  throughput: ThroughputCounter;
  lastUpdateTime: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private suggestedBatchSize: number = 1000;
  private readonly minBatchSize: number = 100;
  private readonly maxBatchSize: number = 5000;
  
  constructor() {
    this.metrics = {
      messagesProcessed: 0,
      processingTime: new MovingAverage(100),
      queueDepth: new MovingAverage(100),
      throughput: new ThroughputCounter(),
      lastUpdateTime: Date.now()
    };
  }
  
  recordProcessing(startTime: number, messageCount: number, queueDepth: number): void {
    const duration = Date.now() - startTime;
    
    this.metrics.messagesProcessed += messageCount;
    this.metrics.processingTime.add(duration);
    this.metrics.queueDepth.add(queueDepth);
    this.metrics.throughput.record(messageCount);
    this.metrics.lastUpdateTime = Date.now();
    
    // Auto-tune batch size based on performance
    this.autoTuneBatchSize();
  }
  
  private autoTuneBatchSize(): void {
    const avgProcessingTime = this.metrics.processingTime.average;
    const avgQueueDepth = this.metrics.queueDepth.average;
    
    if (avgProcessingTime > 100 || avgQueueDepth > 5000) {
      // Slow processing or queue building up - reduce batch size
      this.suggestedBatchSize = Math.max(
        this.minBatchSize,
        Math.floor(this.suggestedBatchSize * 0.8)
      );
    } else if (avgProcessingTime < 20 && avgQueueDepth < 1000) {
      // Fast processing and low queue - increase batch size
      this.suggestedBatchSize = Math.min(
        this.maxBatchSize,
        Math.floor(this.suggestedBatchSize * 1.2)
      );
    }
  }
  
  getSuggestedBatchSize(): number {
    return this.suggestedBatchSize;
  }
  
  getStatistics() {
    return {
      messagesProcessed: this.metrics.messagesProcessed,
      avgProcessingTime: this.metrics.processingTime.average,
      avgQueueDepth: this.metrics.queueDepth.average,
      throughputPerSecond: this.metrics.throughput.getThroughput(1),
      throughputPerMinute: this.metrics.throughput.getThroughput(60),
      suggestedBatchSize: this.suggestedBatchSize,
      lastUpdateTime: this.metrics.lastUpdateTime
    };
  }
  
  reset(): void {
    this.metrics.messagesProcessed = 0;
    this.metrics.processingTime.reset();
    this.metrics.queueDepth.reset();
    this.metrics.throughput = new ThroughputCounter();
    this.suggestedBatchSize = 1000;
  }
}