import { CalculatedColumnDefinition } from '../types';

/**
 * Configuration structure for calculated columns storage
 */
interface CalculatedColumnsConfiguration {
  version: string;
  columns: CalculatedColumnDefinition[];
  timestamp: number;
}

/**
 * Grid-level calculated columns storage service
 * Manages calculated column definitions that are shared across all profiles for a specific grid instance
 */
export class GridCalculatedColumnsStorage {
  private static readonly STORAGE_KEY_PREFIX = 'grid_calculated_columns_';
  
  /**
   * Get the storage key for a specific grid instance
   */
  private static getStorageKey(gridInstanceId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${gridInstanceId}`;
  }
  
  /**
   * Load all calculated columns for a grid instance
   */
  static loadColumns(gridInstanceId: string): CalculatedColumnDefinition[] {
    try {
      const storageKey = this.getStorageKey(gridInstanceId);
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        console.log(`[GridCalculatedColumnsStorage] No columns found for grid: ${gridInstanceId}`);
        return [];
      }
      
      const config: CalculatedColumnsConfiguration = JSON.parse(stored);
      console.log(`[GridCalculatedColumnsStorage] Loaded ${config.columns.length} columns for grid: ${gridInstanceId}`);
      
      return config.columns || [];
    } catch (error) {
      console.error(`[GridCalculatedColumnsStorage] Error loading columns for grid ${gridInstanceId}:`, error);
      return [];
    }
  }
  
  /**
   * Save all calculated columns for a grid instance
   */
  static saveColumns(gridInstanceId: string, columns: CalculatedColumnDefinition[]): void {
    try {
      const config: CalculatedColumnsConfiguration = {
        version: '2.0.0', // Updated version for new architecture
        columns: columns,
        timestamp: Date.now()
      };
      
      const storageKey = this.getStorageKey(gridInstanceId);
      localStorage.setItem(storageKey, JSON.stringify(config, null, 2));
      
      console.log(`[GridCalculatedColumnsStorage] Saved ${columns.length} columns for grid: ${gridInstanceId}`);
    } catch (error) {
      console.error(`[GridCalculatedColumnsStorage] Error saving columns for grid ${gridInstanceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add or update a calculated column
   */
  static saveColumn(gridInstanceId: string, column: CalculatedColumnDefinition): void {
    const existingColumns = this.loadColumns(gridInstanceId);
    const existingIndex = existingColumns.findIndex(c => c.id === column.id);
    
    const updatedColumn = {
      ...column,
      updatedAt: Date.now(),
      createdAt: column.createdAt || Date.now()
    };
    
    if (existingIndex >= 0) {
      // Update existing column
      existingColumns[existingIndex] = updatedColumn;
      console.log(`[GridCalculatedColumnsStorage] Updated column: ${column.id}`);
    } else {
      // Add new column
      existingColumns.push(updatedColumn);
      console.log(`[GridCalculatedColumnsStorage] Added new column: ${column.id}`);
    }
    
    this.saveColumns(gridInstanceId, existingColumns);
  }
  
  /**
   * Delete a calculated column
   */
  static deleteColumn(gridInstanceId: string, columnId: string): void {
    const existingColumns = this.loadColumns(gridInstanceId);
    const filteredColumns = existingColumns.filter(c => c.id !== columnId);
    
    if (filteredColumns.length !== existingColumns.length) {
      this.saveColumns(gridInstanceId, filteredColumns);
      console.log(`[GridCalculatedColumnsStorage] Deleted column: ${columnId}`);
    } else {
      console.warn(`[GridCalculatedColumnsStorage] Column not found for deletion: ${columnId}`);
    }
  }
  
  /**
   * Get a specific column by ID
   */
  static getColumn(gridInstanceId: string, columnId: string): CalculatedColumnDefinition | null {
    const columns = this.loadColumns(gridInstanceId);
    return columns.find(c => c.id === columnId) || null;
  }
  
  /**
   * Get multiple columns by IDs
   */
  static getColumns(gridInstanceId: string, columnIds: string[]): CalculatedColumnDefinition[] {
    const allColumns = this.loadColumns(gridInstanceId);
    return columnIds
      .map(id => allColumns.find(c => c.id === id))
      .filter((column): column is CalculatedColumnDefinition => column !== undefined);
  }
  
  /**
   * Check if a column exists
   */
  static hasColumn(gridInstanceId: string, columnId: string): boolean {
    return this.getColumn(gridInstanceId, columnId) !== null;
  }
  
  /**
   * Get all column IDs
   */
  static getAllColumnIds(gridInstanceId: string): string[] {
    const columns = this.loadColumns(gridInstanceId);
    return columns.map(c => c.id);
  }
  
  /**
   * Clear all columns for a grid instance
   */
  static clearColumns(gridInstanceId: string): void {
    const storageKey = this.getStorageKey(gridInstanceId);
    localStorage.removeItem(storageKey);
    console.log(`[GridCalculatedColumnsStorage] Cleared all columns for grid: ${gridInstanceId}`);
  }
  
  /**
   * Migrate old profile-based columns to grid-level storage
   */
  static migrateFromProfileColumns(
    gridInstanceId: string, 
    profileColumns: CalculatedColumnDefinition[]
  ): string[] {
    if (!profileColumns || profileColumns.length === 0) {
      return [];
    }
    
    console.log(`[GridCalculatedColumnsStorage] Migrating ${profileColumns.length} columns from profile to grid level`);
    
    const existingColumns = this.loadColumns(gridInstanceId);
    const migratedColumnIds: string[] = [];
    
    profileColumns.forEach(profileColumn => {
      // Ensure column has an ID and timestamps
      const migratedColumn: CalculatedColumnDefinition = {
        ...profileColumn,
        id: profileColumn.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: profileColumn.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      
      // Check if column already exists (avoid duplicates)
      if (!existingColumns.find(c => c.id === migratedColumn.id)) {
        existingColumns.push(migratedColumn);
        migratedColumnIds.push(migratedColumn.id);
      } else {
        // Column already exists, just add to active list
        migratedColumnIds.push(migratedColumn.id);
      }
    });
    
    if (migratedColumnIds.length > 0) {
      this.saveColumns(gridInstanceId, existingColumns);
      console.log(`[GridCalculatedColumnsStorage] Migration complete. Migrated column IDs:`, migratedColumnIds);
    }
    
    return migratedColumnIds;
  }
}