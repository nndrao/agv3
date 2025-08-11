import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, UI_CONSTANTS } from '../config/constants';

interface UseViewTitleResult {
  currentViewTitle: string;
  saveViewTitle: (title: string) => void;
  restoreViewTitle: () => void;
}

export function useViewTitle(viewInstanceId: string): UseViewTitleResult {
  const [currentViewTitle, setCurrentViewTitle] = useState('');
  
  // Save view title to localStorage and update document
  const saveViewTitle = useCallback((title: string) => {
    // Update document title immediately
    document.title = title;
    
    // Save title for persistence
    localStorage.setItem(STORAGE_KEYS.VIEW_TITLE(viewInstanceId), title);
    setCurrentViewTitle(title);
    
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
  
  // Restore view title from localStorage
  const restoreViewTitle = useCallback(() => {
    const savedTitle = localStorage.getItem(STORAGE_KEYS.VIEW_TITLE(viewInstanceId));
    if (savedTitle) {
      
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
    } else {
    }
  }, [viewInstanceId]);
  
  // Restore title on mount
  useEffect(() => {
    const checkAndRestoreTitle = async () => {
      try {
        // Use the viewInstanceId which is unique for each view
        const savedTitle = localStorage.getItem(STORAGE_KEYS.VIEW_TITLE(viewInstanceId));
        if (savedTitle) {
          
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
        } else {
        }
      } catch (error) {
        console.warn('[useViewTitle] Could not restore title:', error);
      }
    };
    
    // Check immediately
    checkAndRestoreTitle();
    
    // Also check after a longer delay in case something else is setting the title
    const timeoutId = setTimeout(checkAndRestoreTitle, UI_CONSTANTS.TITLE_RESTORE_DELAY);
    
    return () => clearTimeout(timeoutId);
  }, [viewInstanceId]);
  
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