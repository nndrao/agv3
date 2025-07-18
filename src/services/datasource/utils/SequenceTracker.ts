export interface SequenceResult {
  status: 'ready' | 'buffered' | 'duplicate' | 'gap-detected';
  data?: any[];
  missingSequences?: number[];
}

export class SequenceTracker {
  private expectedSequence: number = 1;
  private missingSequences: Set<number> = new Set();
  private outOfOrderBuffer: Map<number, any> = new Map();
  private maxBufferSize: number = 1000;
  private gapTimeout: number = 5000; // 5 seconds
  private gapTimers: Map<number, NodeJS.Timeout> = new Map();
  
  constructor(startSequence: number = 1, options?: { maxBufferSize?: number; gapTimeout?: number }) {
    this.expectedSequence = startSequence;
    if (options?.maxBufferSize) {
      this.maxBufferSize = options.maxBufferSize;
    }
    if (options?.gapTimeout) {
      this.gapTimeout = options.gapTimeout;
    }
  }
  
  processSequencedData(sequence: number, data: any): SequenceResult {
    // Clear any gap timer for this sequence
    this.clearGapTimer(sequence);
    
    if (sequence === this.expectedSequence) {
      // In-order message
      this.expectedSequence++;
      this.missingSequences.delete(sequence);
      
      // Check if we can process buffered messages
      const readyMessages = this.checkOutOfOrderBuffer();
      
      return {
        status: 'ready',
        data: [data, ...readyMessages]
      };
    } else if (sequence > this.expectedSequence) {
      // Out of order - buffer it
      if (this.outOfOrderBuffer.size >= this.maxBufferSize) {
        // Buffer full - drop oldest
        const oldestKey = Math.min(...Array.from(this.outOfOrderBuffer.keys()));
        this.outOfOrderBuffer.delete(oldestKey);
      }
      
      this.outOfOrderBuffer.set(sequence, data);
      
      // Mark missing sequences and set gap timers
      const missingSeqs: number[] = [];
      for (let i = this.expectedSequence; i < sequence; i++) {
        if (!this.missingSequences.has(i)) {
          this.missingSequences.add(i);
          missingSeqs.push(i);
          this.setGapTimer(i);
        }
      }
      
      return { 
        status: 'buffered',
        missingSequences: missingSeqs
      };
    } else {
      // Duplicate or late message
      return { status: 'duplicate' };
    }
  }
  
  private checkOutOfOrderBuffer(): any[] {
    const ready: any[] = [];
    
    while (this.outOfOrderBuffer.has(this.expectedSequence)) {
      ready.push(this.outOfOrderBuffer.get(this.expectedSequence));
      this.outOfOrderBuffer.delete(this.expectedSequence);
      this.missingSequences.delete(this.expectedSequence);
      this.clearGapTimer(this.expectedSequence);
      this.expectedSequence++;
    }
    
    return ready;
  }
  
  private setGapTimer(sequence: number): void {
    if (this.gapTimers.has(sequence)) {
      return;
    }
    
    const timer = setTimeout(() => {
      // Gap timeout - skip this sequence
      this.handleGapTimeout(sequence);
    }, this.gapTimeout);
    
    this.gapTimers.set(sequence, timer);
  }
  
  private clearGapTimer(sequence: number): void {
    const timer = this.gapTimers.get(sequence);
    if (timer) {
      clearTimeout(timer);
      this.gapTimers.delete(sequence);
    }
  }
  
  private handleGapTimeout(sequence: number): void {
    console.warn(`Sequence gap timeout for sequence ${sequence}, skipping`);
    this.missingSequences.delete(sequence);
    this.gapTimers.delete(sequence);
    
    // If this was the expected sequence, advance
    if (sequence === this.expectedSequence) {
      this.expectedSequence++;
      // Check buffer again
      this.checkOutOfOrderBuffer();
    }
  }
  
  // Force process all buffered messages (e.g., on snapshot complete)
  forceProcessBuffer(): any[] {
    const allBuffered: any[] = [];
    
    // Sort by sequence and return all
    const sortedKeys = Array.from(this.outOfOrderBuffer.keys()).sort((a, b) => a - b);
    
    for (const key of sortedKeys) {
      allBuffered.push(this.outOfOrderBuffer.get(key));
    }
    
    // Clear everything
    this.outOfOrderBuffer.clear();
    this.missingSequences.clear();
    this.gapTimers.forEach(timer => clearTimeout(timer));
    this.gapTimers.clear();
    
    // Set expected to highest + 1
    if (sortedKeys.length > 0) {
      this.expectedSequence = sortedKeys[sortedKeys.length - 1] + 1;
    }
    
    return allBuffered;
  }
  
  getStatistics() {
    return {
      expectedSequence: this.expectedSequence,
      missingCount: this.missingSequences.size,
      bufferSize: this.outOfOrderBuffer.size,
      missingSequences: Array.from(this.missingSequences).sort((a, b) => a - b)
    };
  }
  
  reset(startSequence: number = 1): void {
    this.expectedSequence = startSequence;
    this.missingSequences.clear();
    this.outOfOrderBuffer.clear();
    this.gapTimers.forEach(timer => clearTimeout(timer));
    this.gapTimers.clear();
  }
}