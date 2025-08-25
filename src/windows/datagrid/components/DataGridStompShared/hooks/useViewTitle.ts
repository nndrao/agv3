import { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEYS, UI_CONSTANTS } from '../config/constants';
import { StorageClient } from '@/services/storage/storageClient';
import { UnifiedConfig } from '@/services/storage/types';

interface UseViewTitleResult {
  currentViewTitle: string;
  saveViewTitle: (title: string) => void;
  restoreViewTitle: () => void;
}

interface ViewTitleConfig {
  title: string;
  viewInstanceId: string;
  lastUpdated: Date;
}

export function useViewTitle(viewInstanceId: string): UseViewTitleResult {
  const [currentViewTitle, setCurrentViewTitle] = useState('');
  const configIdRef = useRef<string>(`view-title-${viewInstanceId}`);
  
  // Save view title to Configuration Service and update document
  const saveViewTitle = useCallback(async (title: string) => {
    // Update document title immediately
    document.title = title;
    setCurrentViewTitle(title);
    
    // Save title for persistence using Configuration Service
    try {
      const titleConfig: ViewTitleConfig = {
        title,
        viewInstanceId,
        lastUpdated: new Date()
      };
      
      // Check if config exists
      const existing = await StorageClient.get(configIdRef.current);
      
      if (existing) {
        // Update existing
        await StorageClient.update(configIdRef.current, {
          config: titleConfig,
          lastUpdated: new Date(),
          lastUpdatedBy: 'current-user'
        });
      } else {
        // Create new
        const unifiedConfig: UnifiedConfig = {
          configId: configIdRef.current,
          appId: 'agv3',
          userId: 'current-user',
          componentType: 'view',
          componentSubType: 'title',
          name: `View Title - ${viewInstanceId}`,
          description: `Title configuration for view ${viewInstanceId}`,
          config: titleConfig,
          settings: [],
          activeSetting: 'default',
          createdBy: 'current-user',
          lastUpdatedBy: 'current-user',
          creationTime: new Date(),
          lastUpdated: new Date()
        };
        
        await StorageClient.save(unifiedConfig);
      }
      
      console.log('[useViewTitle] Saved title to Configuration Service:', title);
    } catch (error) {
      console.error('[useViewTitle] Failed to save title to Configuration Service:', error);
      // No fallback - handle error appropriately
    }
    
    // Try to update view options (may not work in all cases)
    if (typeof fin !== 'undefined' && fin.View) {
      fin.View.getCurrent()
        .then((currentView: any) => {
          return currentView.updateOptions({ 
            title: title,
            titleOrder: 'options'
          });
        })
        .catch((e: any) => {
          // Silent fail - not critical
          console.warn('[useViewTitle] Could not update view options:', e);
        });
    }
  }, [viewInstanceId]);
  
  // Restore view title from Configuration Service
  const restoreViewTitle = useCallback(async () => {
    try {
      // Try to load from Configuration Service
      const config = await StorageClient.get(configIdRef.current);
      
      if (config && config.config) {
        const titleConfig = config.config as ViewTitleConfig;
        const savedTitle = titleConfig.title;
        
        // Apply the title immediately
        document.title = savedTitle;
        setCurrentViewTitle(savedTitle);
        
        // Also apply with a small delay to ensure it overrides any default title setting
        setTimeout(() => {
          document.title = savedTitle;
        }, 100);
        
        // Update view options with another delay to ensure the view is fully initialized
        if (typeof fin !== 'undefined' && fin.View) {
          setTimeout(async () => {
            try {
              const currentView = await fin.View.getCurrent();
              await currentView.updateOptions({
                title: savedTitle,
                titleOrder: 'options'
              });
            } catch (e) {
              console.warn('[useViewTitle] Could not update view options:', e);
            }
          }, 500);
        }
        
        console.log('[useViewTitle] Restored title from Configuration Service:', savedTitle);
      }
    } catch (error) {
      console.error('[useViewTitle] Failed to restore title from Configuration Service:', error);
      // Use default title on error
    }
  }, [viewInstanceId, saveViewTitle]);
  
  // Restore title on mount
  useEffect(() => {
    // Use the async restoreViewTitle function
    restoreViewTitle();
    
    // Also check after a longer delay in case something else is setting the title
    const timeoutId = setTimeout(restoreViewTitle, UI_CONSTANTS.TITLE_RESTORE_DELAY);
    
    return () => clearTimeout(timeoutId);
  }, [restoreViewTitle]);
  
  // Expose rename dialog function to be called from context menu
  useEffect(() => {
    (window as any).__showRenameDialog = async () => {
      return new Promise((resolve) => {
        // Get current title
        if (typeof fin !== 'undefined' && fin.View) {
          fin.View.getCurrent().then((view: any) => {
            return view.getOptions();
          }).then((options: any) => {
            const title = document.title || options.title || options.name || 'Untitled';
            setCurrentViewTitle(title);
            
            // Store resolve function to be called when dialog closes
            (window as any).__renameDialogResolve = resolve;
            
            // The parent component will handle showing the dialog
            (window as any).__requestRenameDialog = true;
          }).catch(() => {
            resolve({ success: false });
          });
        } else {
          const title = document.title || 'Untitled';
          setCurrentViewTitle(title);
          (window as any).__renameDialogResolve = resolve;
          (window as any).__requestRenameDialog = true;
        }
      });
    };
    
    return () => {
      delete (window as any).__showRenameDialog;
      delete (window as any).__renameDialogResolve;
      delete (window as any).__requestRenameDialog;
    };
  }, []);
  
  return {
    currentViewTitle,
    saveViewTitle,
    restoreViewTitle
  };
}