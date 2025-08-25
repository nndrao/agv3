import { CalculatedColumnDefinition } from '../types';
import { GridConfigurationStorage } from '../storage/GridConfigurationStorage';

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
 * Now uses the centralized Configuration Service via GridConfigurationStorage
 */
export class GridCalculatedColumnsStorage extends GridConfigurationStorage {
  private static readonly CONFIG_TYPE = 'calculated_columns';
  
  /**
   * Load all calculated columns for a grid instance
   */
  static async loadColumns(gridInstanceId: string): Promise<CalculatedColumnDefinition[]> {
    const config = await this.loadConfig<CalculatedColumnsConfiguration>(
      gridInstanceId,
      this.CONFIG_TYPE,
      { version: '2.0.0', columns: [], timestamp: Date.now() }
    );
    
    console.log(`[GridCalculatedColumnsStorage] Loaded ${config.columns.length} columns for grid: ${gridInstanceId}`);
    return config.columns || [];
  }
  
  /**
   * Save all calculated columns for a grid instance
   */
  static async saveColumns(gridInstanceId: string, columns: CalculatedColumnDefinition[]): Promise<void> {
    const config: CalculatedColumnsConfiguration = {
      version: '2.0.0',
      columns: columns,
      timestamp: Date.now()
    };
    
    await this.saveConfig(
      gridInstanceId,
      this.CONFIG_TYPE,
      config,
      `Calculated Columns for ${gridInstanceId}`
    );
    
    console.log(`[GridCalculatedColumnsStorage] Saved ${columns.length} columns for grid: ${gridInstanceId}`);
  }
  
  /**
   * Add or update a calculated column
   */
  static async saveColumn(gridInstanceId: string, column: CalculatedColumnDefinition): Promise<void> {
    const existingColumns = await this.loadColumns(gridInstanceId);
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
    
    await this.saveColumns(gridInstanceId, existingColumns);
  }
  
  /**
   * Delete a calculated column
   */
  static async deleteColumn(gridInstanceId: string, columnId: string): Promise<void> {
    const existingColumns = await this.loadColumns(gridInstanceId);
    const filteredColumns = existingColumns.filter(c => c.id !== columnId);
    
    if (filteredColumns.length !== existingColumns.length) {
      await this.saveColumns(gridInstanceId, filteredColumns);
      console.log(`[GridCalculatedColumnsStorage] Deleted column: ${columnId}`);
    } else {
      console.warn(`[GridCalculatedColumnsStorage] Column not found for deletion: ${columnId}`);
    }
  }
  
  /**
   * Get a specific column by ID
   */
  static async getColumn(gridInstanceId: string, columnId: string): Promise<CalculatedColumnDefinition | null> {
    const columns = await this.loadColumns(gridInstanceId);
    return columns.find(c => c.id === columnId) || null;
  }
  
  /**
   * Get multiple columns by IDs
   */
  static async getColumns(gridInstanceId: string, columnIds: string[]): Promise<CalculatedColumnDefinition[]> {
    const allColumns = await this.loadColumns(gridInstanceId);
    return columnIds
      .map(id => allColumns.find(c => c.id === id))
      .filter((column): column is CalculatedColumnDefinition => column !== undefined);
  }
  
  /**
   * Check if a column exists
   */
  static async hasColumn(gridInstanceId: string, columnId: string): Promise<boolean> {
    const column = await this.getColumn(gridInstanceId, columnId);
    return column !== null;
  }
  
  /**
   * Get all column IDs
   */
  static async getAllColumnIds(gridInstanceId: string): Promise<string[]> {
    const columns = await this.loadColumns(gridInstanceId);
    return columns.map(c => c.id);
  }
  
  /**
   * Clear all columns for a grid instance
   */
  static async clearColumns(gridInstanceId: string): Promise<void> {
    await this.deleteConfig(gridInstanceId, this.CONFIG_TYPE);
    console.log(`[GridCalculatedColumnsStorage] Cleared all columns for grid: ${gridInstanceId}`);
  }
  
  /**
   * Migrate old profile-based columns to grid-level storage
   */
  static async migrateFromProfileColumns(
    gridInstanceId: string, 
    profileColumns: CalculatedColumnDefinition[]
  ): Promise<string[]> {
    if (!profileColumns || profileColumns.length === 0) {
      return [];
    }
    
    console.log(`[GridCalculatedColumnsStorage] Migrating ${profileColumns.length} columns from profile to grid level`);
    
    const existingColumns = await this.loadColumns(gridInstanceId);
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
      await this.saveColumns(gridInstanceId, existingColumns);
      console.log(`[GridCalculatedColumnsStorage] Migration complete. Migrated column IDs:`, migratedColumnIds);
    }
    
    return migratedColumnIds;
  }
}