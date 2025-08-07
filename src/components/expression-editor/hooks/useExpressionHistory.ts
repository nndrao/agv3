import { useState, useEffect, useCallback } from 'react';
import { ExpressionHistory, ExpressionMode } from '../types';

const STORAGE_KEY = 'expression-editor-history';
const MAX_HISTORY_ITEMS = 50;

export function useExpressionHistory(mode: ExpressionMode) {
  const [history, setHistory] = useState<ExpressionHistory[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allHistory = JSON.parse(stored) as ExpressionHistory[];
        // Filter by mode and sort by timestamp
        const modeHistory = allHistory
          .filter(item => item.mode === mode)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, MAX_HISTORY_ITEMS);
        setHistory(modeHistory);
      }
    } catch (error) {
      console.error('Failed to load expression history:', error);
    }
  }, [mode]);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: ExpressionHistory[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allHistory = stored ? JSON.parse(stored) as ExpressionHistory[] : [];
      
      // Remove old items for this mode
      const otherModeHistory = allHistory.filter(item => item.mode !== mode);
      
      // Combine and save
      const combined = [...newHistory, ...otherModeHistory];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    } catch (error) {
      console.error('Failed to save expression history:', error);
    }
  }, [mode]);

  // Add item to history
  const addToHistory = useCallback((expression: string, isValid: boolean, description?: string) => {
    const newItem: ExpressionHistory = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      expression,
      timestamp: new Date(),
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
  const clearHistory = useCallback(() => {
    setHistory([]);
    
    // Clear from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allHistory = JSON.parse(stored) as ExpressionHistory[];
        const otherModeHistory = allHistory.filter(item => item.mode !== mode);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(otherModeHistory));
      }
    } catch (error) {
      console.error('Failed to clear expression history:', error);
    }
  }, [mode]);

  return {
    history,
    addToHistory,
    clearHistory
  };
}