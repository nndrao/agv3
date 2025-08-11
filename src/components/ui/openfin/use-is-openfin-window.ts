/**
 * Hook to determine if the current context is an OpenFin window
 * 
 * This helps determine when to use OpenFin-adapted (portal-less) components
 * vs standard shadcn/ui components with portals.
 * 
 * @returns {boolean} true if running in an OpenFin window context
 */

import { useEffect, useState } from 'react';

export function useIsOpenFinWindow(): boolean {
  const [isOpenFinWindow, setIsOpenFinWindow] = useState(false);

  useEffect(() => {
    // Check if we're in an OpenFin environment
    if (typeof fin !== 'undefined' && fin.Window) {
      // Check if this is a child window (not the main provider window)
      fin.Window.getCurrent()
        .then((currentWindow: any) => {
          // Get window identity
          return currentWindow.getInfo();
        })
        .then((windowInfo: any) => {
          // Determine if this is a child/dialog window
          // You can customize this logic based on your window naming conventions
          const isChildWindow = 
            windowInfo.name !== 'provider-window' &&
            !windowInfo.name.includes('main') &&
            (windowInfo.name.includes('dialog') ||
             windowInfo.name.includes('editor') ||
             windowInfo.name.includes('customization') ||
             windowInfo.name.includes('formatting'));
          
          setIsOpenFinWindow(isChildWindow);
        })
        .catch(() => {
          // If we can't get window info, assume it's not a child window
          setIsOpenFinWindow(false);
        });
    } else {
      // Not in OpenFin environment
      setIsOpenFinWindow(false);
    }
  }, []);

  return isOpenFinWindow;
}

/**
 * Utility function to get the appropriate component based on context
 * 
 * @example
 * ```tsx
 * import { Select as StandardSelect } from '@/components/ui/select';
 * import { Select as OpenFinSelect } from '@/components/ui/openfin';
 * import { getContextualComponent } from '@/components/ui/openfin';
 * 
 * const Select = getContextualComponent(StandardSelect, OpenFinSelect);
 * ```
 */
export function getContextualComponent<T>(
  standardComponent: T,
  openfinComponent: T
): T {
  // Simple check - can be made more sophisticated
  if (typeof fin !== 'undefined' && window.name && !window.name.includes('provider')) {
    return openfinComponent;
  }
  return standardComponent;
}