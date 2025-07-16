import { EventEmitter } from 'events';

export interface ConflationConfig {
  windowMs: number;
  maxBatchSize: number;
  enableMetrics: boolean;
}

export interface DataUpdate<T> {
  data: T;
  operation: 'add' | 'update' | 'remove';
  timestamp: number;
}

export interface ConflationMetrics {
  totalUpdatesReceived: number;
  updatesApplied: number;
  updatesConflated: number;
  currentUpdateRate: number;
  averageUpdateRate: number;
  conflationRate: number;
  lastUpdateTimestamp: number;
  snapshotSize: number;
}

export class ConflatedDataStore<T extends Record<string, any>> extends EventEmitter {
  private snapshot = new Map<string, T>();
  private updateQueue: DataUpdate<T>[] = [];
  private conflationTimer: NodeJS.Timeout | null = null;
  private metrics: ConflationMetrics = {
    totalUpdatesReceived: 0,
    updatesApplied: 0,
    updatesConflated: 0,
    currentUpdateRate: 0,
    averageUpdateRate: 0,
    conflationRate: 0,
    lastUpdateTimestamp: 0,
    snapshotSize: 0,
  };
  
  private updateRateWindow: number[] = [];
  private updateRateWindowSize = 10; // Track last 10 seconds
  private lastRateCalculation = Date.now();
  
  constructor(
    private keyColumn: string,
    private config: ConflationConfig = {
      windowMs: 100,
      maxBatchSize: 1000,
      enableMetrics: true,
    }
  ) {
    super();
  }
  
  /**
   * Add an update to the queue for conflation
   */
  addUpdate(update: DataUpdate<T>): void {
    this.updateQueue.push(update);
    this.metrics.totalUpdatesReceived++;
    this.metrics.lastUpdateTimestamp = Date.now();
    
    // Start or reset the conflation timer
    if (this.conflationTimer) {
      clearTimeout(this.conflationTimer);
    }
    
    this.conflationTimer = setTimeout(() => {
      this.processUpdateQueue();
    }, this.config.windowMs);
  }
  
  /**
   * Process the update queue, conflating updates for the same key
   */
  private processUpdateQueue(): void {
    if (this.updateQueue.length === 0) return;
    
    const startTime = Date.now();
    const conflated = new Map<string, DataUpdate<T>>();
    let conflatedCount = 0;
    
    // Process updates in order, keeping only the latest for each key
    this.updateQueue.forEach(update => {
      const key = String(update.data[this.keyColumn]);
      
      // If we've seen this key before in this batch, it's conflation
      if (conflated.has(key)) {
        conflatedCount++;
      }
      
      // For remove operations, we need to handle differently
      if (update.operation === 'remove') {
        // If there was an add/update for this key, cancel it out
        const existing = conflated.get(key);
        if (existing && existing.operation === 'add') {
          // Add followed by remove = no-op
          conflated.delete(key);
        } else {
          // Otherwise, keep the remove
          conflated.set(key, update);
        }
      } else {
        // For add/update, always keep the latest
        conflated.set(key, update);
      }
    });
    
    // Clear the queue
    this.updateQueue = [];
    
    // Update metrics
    this.metrics.updatesConflated += conflatedCount;
    
    // Apply to snapshot
    const updates: DataUpdate<T>[] = [];
    conflated.forEach((update, key) => {
      switch (update.operation) {
        case 'add':
        case 'update':
          this.snapshot.set(key, update.data);
          break;
        case 'remove':
          this.snapshot.delete(key);
          break;
      }
      updates.push(update);
    });
    
    this.metrics.snapshotSize = this.snapshot.size;
    this.metrics.updatesApplied += updates.length;
    
    // Update rate metrics
    this.updateRateMetrics(updates.length);
    
    // Emit the conflated updates
    if (updates.length > 0) {
      console.log(`[ConflatedDataStore] Emitting ${updates.length} updates (${conflatedCount} conflated)`);
      this.emit('updates', updates);
    }
    
    // Emit metrics if enabled
    if (this.config.enableMetrics) {
      this.emit('metrics', { ...this.metrics });
    }
    
    const processingTime = Date.now() - startTime;
    if (processingTime > 10) {
      console.warn(`[ConflatedDataStore] Processing took ${processingTime}ms`);
    }
  }
  
  /**
   * Update rate metrics
   */
  private updateRateMetrics(updateCount: number): void {
    const now = Date.now();
    const timeSinceLastCalc = now - this.lastRateCalculation;
    
    if (timeSinceLastCalc >= 1000) { // Update every second
      // Calculate current rate
      const currentRate = (updateCount / timeSinceLastCalc) * 1000;
      this.updateRateWindow.push(currentRate);
      
      // Keep only last N seconds
      if (this.updateRateWindow.length > this.updateRateWindowSize) {
        this.updateRateWindow.shift();
      }
      
      // Calculate average rate
      const avgRate = this.updateRateWindow.reduce((a, b) => a + b, 0) / this.updateRateWindow.length;
      
      this.metrics.currentUpdateRate = Math.round(currentRate);
      this.metrics.averageUpdateRate = Math.round(avgRate);
      
      // Calculate conflation rate
      if (this.metrics.totalUpdatesReceived > 0) {
        this.metrics.conflationRate = Math.round(
          (this.metrics.updatesConflated / this.metrics.totalUpdatesReceived) * 100
        );
      }
      
      this.lastRateCalculation = now;
    }
  }
  
  /**
   * Set the initial snapshot data
   */
  setSnapshot(data: T[]): void {
    this.snapshot.clear();
    data.forEach(item => {
      const key = String(item[this.keyColumn]);
      this.snapshot.set(key, item);
    });
    this.metrics.snapshotSize = this.snapshot.size;
    console.log(`[ConflatedDataStore] Snapshot set with ${this.snapshot.size} rows`);
  }
  
  /**
   * Get the current snapshot
   */
  getSnapshot(): T[] {
    return Array.from(this.snapshot.values());
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): ConflationMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Clear all data and reset metrics
   */
  clear(): void {
    if (this.conflationTimer) {
      clearTimeout(this.conflationTimer);
      this.conflationTimer = null;
    }
    
    this.snapshot.clear();
    this.updateQueue = [];
    this.metrics = {
      totalUpdatesReceived: 0,
      updatesApplied: 0,
      updatesConflated: 0,
      currentUpdateRate: 0,
      averageUpdateRate: 0,
      conflationRate: 0,
      lastUpdateTimestamp: 0,
      snapshotSize: 0,
    };
    this.updateRateWindow = [];
  }
  
  /**
   * Destroy the store and clean up
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}