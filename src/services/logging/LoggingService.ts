/**
 * Centralized Logging Service
 * 
 * Provides structured logging with IndexedDB persistence,
 * query capabilities, and export functionality
 */

import { LogEntry, LogFilter, LoggingClient } from '../openfin/ServiceContext';
import { v4 as uuidv4 } from 'uuid';

export class LoggingService implements LoggingClient {
  private static instance: LoggingService | null = null;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'agv3-logs';
  private readonly storeName = 'logs';
  private readonly dbVersion = 1;
  private viewId: string;
  private userId?: string;
  private sessionId: string;
  private logToConsole: boolean;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';
  private readonly maxLogSize = 10000; // Maximum logs to keep
  private readonly cleanupInterval = 3600000; // 1 hour
  private cleanupTimer?: NodeJS.Timeout;

  private constructor(config: {
    viewId: string;
    userId?: string;
    sessionId?: string;
    logToConsole?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  }) {
    this.viewId = config.viewId;
    this.userId = config.userId;
    this.sessionId = config.sessionId || uuidv4();
    this.logToConsole = config.logToConsole ?? true;
    this.logLevel = config.logLevel ?? 'info';
  }

  /**
   * Get or create singleton instance
   */
  static async getInstance(config: {
    viewId: string;
    userId?: string;
    sessionId?: string;
    logToConsole?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  }): Promise<LoggingService> {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService(config);
      await LoggingService.instance.initialize();
    }
    return LoggingService.instance;
  }

  /**
   * Initialize IndexedDB
   */
  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[LoggingService] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.startCleanupTimer();
        console.log('[LoggingService] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create logs object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id',
            autoIncrement: false 
          });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
          store.createIndex('viewId', 'viewId', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('source', 'source', { unique: false });
          
          // Compound index for common queries
          store.createIndex('viewId_timestamp', ['viewId', 'timestamp'], { unique: false });
          store.createIndex('level_timestamp', ['level', 'timestamp'], { unique: false });
        }
      };
    });
  }

  /**
   * Check if a log level should be logged based on current level
   */
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Write log entry to IndexedDB
   */
  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.db) {
      console.warn('[LoggingService] Database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[LoggingService] Failed to write log:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Log to console if enabled
   */
  private logToConsoleIfEnabled(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): void {
    if (!this.logToConsole) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.viewId}]`;
    
    const logMessage = context 
      ? `${prefix} ${message} ${JSON.stringify(context)}`
      : `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.log(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    // Extract source from context or stack trace
    const error = new Error();
    const stack = error.stack || '';
    const source = this.extractSource(stack);

    return {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      context,
      viewId: this.viewId,
      userId: this.userId,
      sessionId: this.sessionId,
      source,
      stack: level === 'error' ? stack : undefined
    };
  }

  /**
   * Extract source file from stack trace
   */
  private extractSource(stack: string): string {
    const lines = stack.split('\n');
    // Skip first two lines (Error message and this function)
    const callerLine = lines[3] || '';
    
    // Extract file name from stack trace
    const match = callerLine.match(/\((.*?):\d+:\d+\)/) || 
                  callerLine.match(/at (.*?):\d+:\d+/);
    
    if (match && match[1]) {
      // Get just the file name, not the full path
      const parts = match[1].split('/');
      return parts[parts.length - 1];
    }
    
    return 'unknown';
  }

  // ============================================================================
  // Public Logging Methods
  // ============================================================================

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    
    this.logToConsoleIfEnabled('debug', message, context);
    const entry = this.createLogEntry('debug', message, context);
    this.writeLog(entry).catch(err => 
      console.error('[LoggingService] Failed to write debug log:', err)
    );
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    
    this.logToConsoleIfEnabled('info', message, context);
    const entry = this.createLogEntry('info', message, context);
    this.writeLog(entry).catch(err => 
      console.error('[LoggingService] Failed to write info log:', err)
    );
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    
    this.logToConsoleIfEnabled('warn', message, context);
    const entry = this.createLogEntry('warn', message, context);
    this.writeLog(entry).catch(err => 
      console.error('[LoggingService] Failed to write warn log:', err)
    );
  }

  error(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;
    
    this.logToConsoleIfEnabled('error', message, context);
    const entry = this.createLogEntry('error', message, context);
    this.writeLog(entry).catch(err => 
      console.error('[LoggingService] Failed to write error log:', err)
    );
  }

  // ============================================================================
  // Query and Management Methods
  // ============================================================================

  async query(filter: LogFilter): Promise<LogEntry[]> {
    if (!this.db) {
      console.warn('[LoggingService] Database not initialized');
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const results: LogEntry[] = [];

      // Build the query
      let request: IDBRequest;
      
      if (filter.viewId && filter.startTime && filter.endTime) {
        // Use compound index for viewId + timestamp
        const index = store.index('viewId_timestamp');
        const range = IDBKeyRange.bound(
          [filter.viewId, filter.startTime],
          [filter.viewId, filter.endTime]
        );
        request = index.openCursor(range);
      } else if (filter.level && filter.startTime && filter.endTime) {
        // Use compound index for level + timestamp
        const index = store.index('level_timestamp');
        const range = IDBKeyRange.bound(
          [filter.level, filter.startTime],
          [filter.level, filter.endTime]
        );
        request = index.openCursor(range);
      } else if (filter.startTime && filter.endTime) {
        // Use timestamp index
        const index = store.index('timestamp');
        const range = IDBKeyRange.bound(filter.startTime, filter.endTime);
        request = index.openCursor(range);
      } else {
        // Get all records
        request = store.openCursor();
      }

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as LogEntry;
          
          // Apply additional filters
          let include = true;
          
          if (filter.level && entry.level !== filter.level) include = false;
          if (filter.viewId && entry.viewId !== filter.viewId) include = false;
          if (filter.userId && entry.userId !== filter.userId) include = false;
          if (filter.sessionId && entry.sessionId !== filter.sessionId) include = false;
          if (filter.source && entry.source !== filter.source) include = false;
          if (filter.search && !entry.message.toLowerCase().includes(filter.search.toLowerCase())) {
            include = false;
          }
          
          if (include) {
            results.push(entry);
            
            // Check limit
            if (filter.limit && results.length >= filter.limit) {
              resolve(results);
              return;
            }
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('[LoggingService] Query failed:', request.error);
        reject(request.error);
      };
    });
  }

  async export(format: 'json' | 'csv', filter?: LogFilter): Promise<string> {
    const logs = await this.query(filter || {});
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = ['id', 'timestamp', 'level', 'message', 'viewId', 'userId', 'sessionId', 'source'];
      const rows = logs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.viewId,
        log.userId || '',
        log.sessionId,
        log.source || ''
      ]);
      
      return [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
    }
  }

  async clear(filter?: LogFilter): Promise<number> {
    if (!filter) {
      // Clear all logs
      return this.clearAll();
    }
    
    // Clear logs matching filter
    const logs = await this.query(filter);
    let deleted = 0;
    
    for (const log of logs) {
      await this.deleteLog(log.id);
      deleted++;
    }
    
    return deleted;
  }

  /**
   * Delete a single log entry
   */
  private async deleteLog(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all logs
   */
  private async clearAll(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Count before clearing
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => resolve(count);
        clearRequest.onerror = () => reject(clearRequest.error);
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  /**
   * Start periodic cleanup of old logs
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(err => 
        console.error('[LoggingService] Cleanup failed:', err)
      );
    }, this.cleanupInterval);
  }

  /**
   * Clean up old logs to prevent database growth
   */
  private async cleanup(): Promise<void> {
    if (!this.db) return;

    // Delete logs older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await this.clear({
      endTime: sevenDaysAgo
    });

    // If still too many logs, keep only the most recent
    const count = await this.getLogCount();
    if (count > this.maxLogSize) {
      const toDelete = count - this.maxLogSize;
      const oldestLogs = await this.query({
        limit: toDelete
      });
      
      for (const log of oldestLogs) {
        await this.deleteLog(log.id);
      }
    }
  }

  /**
   * Get total log count
   */
  private async getLogCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Destroy the service and clean up resources
   */
  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    LoggingService.instance = null;
  }
}