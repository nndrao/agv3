import { useState, useEffect, useCallback, useRef } from 'react';
import { ExpressionHistory, ExpressionMode } from '../types';
import { StorageClient } from '@/services/storage/storageClient';
import { UnifiedConfig } from '@/services/storage/types';

const STORAGE_KEY = 'expression-editor-history';
const CONFIG_ID = 'agv3-expression-history';
const MAX_HISTORY_ITEMS = 50;

interface ExpressionHistoryConfig {
  history: ExpressionHistory[];
  lastUpdated: Date;
}

// Helper function to save history to Configuration Service
async function saveHistoryToConfig(allHistory: ExpressionHistory[]) {
  try {
    const historyConfig: ExpressionHistoryConfig = {
      history: allHistory,
      lastUpdated: new Date()
    };
    
    // Check if config exists
    const existing = await StorageClient.get(CONFIG_ID);
    
    if (existing) {
      // Update existing
      await StorageClient.update(CONFIG_ID, {
        config: historyConfig,
        lastUpdated: new Date(),
        lastUpdatedBy: 'current-user'
      });
    } else {
      // Create new
      const unifiedConfig: UnifiedConfig = {
        configId: CONFIG_ID,
        appId: 'agv3',
        userId: 'current-user',
        componentType: 'expression-editor',
        componentSubType: 'history',
        name: 'Expression Editor History',
        description: 'History of expressions used in the expression editor',
        config: historyConfig,
        settings: [],
        activeSetting: 'default',
        createdBy: 'current-user',
        lastUpdatedBy: 'current-user',
        creationTime: new Date(),
        lastUpdated: new Date()
      };
      
      await StorageClient.save(unifiedConfig);
    }
    
    console.log('[useExpressionHistory] Saved history to Configuration Service');
  } catch (error) {
    console.error('[useExpressionHistory] Failed to save history to Configuration Service:', error);
    // No fallback - handle error appropriately
  }
}

export function useExpressionHistory(mode: ExpressionMode) {
  const [history, setHistory] = useState<ExpressionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const configIdRef = useRef<string>(CONFIG_ID);

  // Load history from Configuration Service
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Try to load from Configuration Service
        const config = await StorageClient.get(configIdRef.current);
        
        if (config && config.config) {
          const historyConfig = config.config as ExpressionHistoryConfig;
          // Filter by mode and sort by timestamp
          const modeHistory = historyConfig.history
            .filter(item => item.mode === mode)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, MAX_HISTORY_ITEMS);
          setHistory(modeHistory);
          console.log('[useExpressionHistory] Loaded history from Configuration Service');
        }
      } catch (error) {
        console.error('[useExpressionHistory] Failed to load history:', error);
        // Use empty history on error
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [mode]);

  // Save history with current mode's updates
  const saveHistory = useCallback(async (newHistory: ExpressionHistory[]) => {
    try {
      // Load current history from Configuration Service to get other modes
      const config = await StorageClient.get(configIdRef.current);
      let otherModeHistory: ExpressionHistory[] = [];
      
      if (config && config.config) {
        const historyConfig = config.config as ExpressionHistoryConfig;
        otherModeHistory = historyConfig.history.filter(item => item.mode !== mode);
      }
      
      // Combine and save
      const combined = [...newHistory, ...otherModeHistory];
      await saveHistoryToConfig(combined);
    } catch (error) {
      console.error('[useExpressionHistory] Failed to save history:', error);
      // No fallback - handle error appropriately
    }
  }, [mode]);

  // Add item to history
  const addToHistory = useCallback((expression: string, isValid: boolean, description?: string) => {
    const newItem: ExpressionHistory = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      expression,
      timestamp: Date.now(),
      mode,
      isValid,
      description
    };

    setHistory(prev => {
      // Check if expression already exists
      const exists = prev.some(item => item.expression === expression);
      if (exists) {
        // Move to top
        const filtered = prev.filter(item => item.expression !== expression);
        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        saveHistory(updated);
        return updated;
      } else {
        // Add new
        const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
        saveHistory(updated);
        return updated;
      }
    });
  }, [mode, saveHistory]);

  // Clear history for current mode
  const clearHistory = useCallback(async () => {
    setHistory([]);
    
    // Clear from Configuration Service
    try {
      // Load current history from Configuration Service to get other modes
      const config = await StorageClient.get(configIdRef.current);
      let otherModeHistory: ExpressionHistory[] = [];
      
      if (config && config.config) {
        const historyConfig = config.config as ExpressionHistoryConfig;
        otherModeHistory = historyConfig.history.filter(item => item.mode !== mode);
      }
      
      // Save with cleared mode history
      await saveHistoryToConfig(otherModeHistory);
    } catch (error) {
      console.error('[useExpressionHistory] Failed to clear history:', error);
      // No fallback - handle error appropriately
    }
  }, [mode]);

  return {
    history,
    addToHistory,
    clearHistory
  };
}