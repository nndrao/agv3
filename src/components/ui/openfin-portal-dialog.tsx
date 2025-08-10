/// <reference types="@openfin/core" />
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { getViewUrl } from '@/utils/urlUtils';

interface OpenFinPortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windowName: string;
  windowOptions?: Partial<OpenFin.WindowOption>;
  children: React.ReactNode;
  onWindowCreated?: (window: OpenFin.Window) => void;
  url?: string; // Optional URL parameter, defaults to grid-options-window.html
  rootElementId?: string; // Optional root element ID, defaults to 'grid-options-root'
}

const defaultWindowOptions: Partial<OpenFin.WindowOption> = {
  defaultWidth: 800,
  defaultHeight: 700,
  defaultCentered: true,
  autoShow: false,
  frame: true,
  resizable: true,
  maximizable: false,
  minimizable: true,
  saveWindowState: false,
  backgroundColor: '#ffffff',
  waitForPageLoad: true
};

export const OpenFinPortalDialog: React.FC<OpenFinPortalDialogProps> = ({
  open,
  onOpenChange,
  windowName,
  windowOptions = {},
  children,
  onWindowCreated,
  url = '/grid-options-window.html',
  rootElementId = 'grid-options-root'
}) => {
  const [portalWindow, setPortalWindow] = useState<OpenFin.Window | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const scriptsRef = useRef<HTMLScriptElement[]>([]);
  const windowRef = useRef<OpenFin.Window | null>(null);
  const isCreatingRef = useRef(false);
  const previousOpenRef = useRef<boolean | null>(null);

  useEffect(() => {
    console.log(`[OpenFinPortalDialog ${windowName}] Effect triggered - open:`, open);
    
    // Only run if open state actually changed
    if (previousOpenRef.current !== null && open === previousOpenRef.current) {
      console.log(`[OpenFinPortalDialog ${windowName}] Skipping - open state unchanged`);
      return;
    }
    previousOpenRef.current = open;

    let cleanup: (() => void) | undefined;

    const createWindow = async () => {
      console.log(`[OpenFinPortalDialog ${windowName}] createWindow called - open:`, open, 'isCreating:', isCreatingRef.current);
      if (!open || isCreatingRef.current) return;
      
      // Check if we already have a window reference
      if (windowRef.current) {
        try {
          // Try to focus existing window
          await windowRef.current.focus();
          await windowRef.current.bringToFront();
          return;
        } catch (error) {
          // Window was closed, clear reference
          windowRef.current = null;
        }
      }

      isCreatingRef.current = true;

      try {
        // Check if fin is available
        if (typeof fin === 'undefined') {
          console.error(`[OpenFinPortalDialog ${windowName}] fin is not defined!`);
          throw new Error('OpenFin API not available');
        }
        
        console.log(`[OpenFinPortalDialog ${windowName}] fin available, creating/finding window...`);
        
        // Check if window already exists by name
        let ofWindow: OpenFin.Window;
        try {
          console.log(`[OpenFinPortalDialog ${windowName}] Trying to wrap existing window...`);
          const existingWindow = await fin.Window.wrapSync({ uuid: fin.me.uuid, name: windowName });
          
          // Close the existing window and create a new one
          console.log(`[OpenFinPortalDialog ${windowName}] Found existing window, closing it...`);
          try {
            await existingWindow.close(true); // Force close
          } catch (closeErr) {
            console.log(`[OpenFinPortalDialog ${windowName}] Error closing existing window:`, closeErr);
          }
          
          // Wait a bit for the window to close
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Now create a new window
          throw new Error('Window closed, create new one');
        } catch (wrapError) {
          console.log(`[OpenFinPortalDialog ${windowName}] Window doesn't exist, creating new...`, wrapError);
          // Window doesn't exist, create it
          const windowUrl = getViewUrl(url);
          const finalOptions: OpenFin.WindowOption = {
            ...defaultWindowOptions,
            ...windowOptions,
            name: windowName,
            url: windowUrl,
          };
          
          console.log(`[OpenFinPortalDialog ${windowName}] Window URL:`, windowUrl);
          console.log(`[OpenFinPortalDialog ${windowName}] Creating window with options:`, finalOptions);
          ofWindow = await fin.Window.create(finalOptions);
          windowRef.current = ofWindow;
          console.log(`[OpenFinPortalDialog ${windowName}] Window created successfully`);
        }

        // Wait for the window to be ready
        console.log(`[OpenFinPortalDialog ${windowName}] Waiting for window to be ready...`);
        await new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 100; // 5 seconds max
          
          const checkReady = async () => {
            attempts++;
            try {
              const win = await ofWindow.getWebWindow();
              const readyState = win?.document?.readyState;
              console.log(`[OpenFinPortalDialog ${windowName}] Attempt ${attempts}: readyState = ${readyState}`);
              
              if (win && win.document && readyState === 'complete') {
                console.log(`[OpenFinPortalDialog ${windowName}] Window is ready!`);
                resolve();
              } else if (attempts >= maxAttempts) {
                console.error(`[OpenFinPortalDialog ${windowName}] Window failed to become ready after ${maxAttempts} attempts`);
                reject(new Error('Window failed to become ready'));
              } else {
                setTimeout(checkReady, 50);
              }
            } catch (err) {
              console.log(`[OpenFinPortalDialog ${windowName}] Error checking window state:`, err);
              if (attempts >= maxAttempts) {
                reject(err);
              } else {
                setTimeout(checkReady, 50);
              }
            }
          };
          checkReady();
        });

        const win = await ofWindow.getWebWindow();
        console.log(`[OpenFinPortalDialog ${windowName}] Got window, looking for root element with ID: ${rootElementId}`);
        const rootElement = win.document.getElementById(rootElementId);
        
        if (!rootElement) {
          console.error(`[OpenFinPortalDialog ${windowName}] Root element '${rootElementId}' not found!`);
          console.log(`[OpenFinPortalDialog ${windowName}] Window document body:`, win.document.body.innerHTML);
          throw new Error(`Portal root element '${rootElementId}' not found`);
        }
        
        console.log(`[OpenFinPortalDialog ${windowName}] Found root element!`);

        // Clear loading message
        rootElement.innerHTML = '';

        // Copy styles from parent window
        const parentStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        const stylePromises: Promise<void>[] = [];

        parentStyles.forEach(style => {
          if (style instanceof HTMLLinkElement) {
            const link = win.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = style.href;
            win.document.head.appendChild(link);
            
            // Wait for stylesheet to load
            stylePromises.push(new Promise((resolve) => {
              link.onload = () => resolve();
              link.onerror = () => resolve(); // Continue even if style fails
            }));
          } else if (style instanceof HTMLStyleElement) {
            const newStyle = win.document.createElement('style');
            newStyle.textContent = style.textContent;
            win.document.head.appendChild(newStyle);
          }
        });
        
        // Add Tailwind base styles to ensure proper interaction
        const tailwindBase = win.document.createElement('style');
        tailwindBase.textContent = `
          *, ::before, ::after {
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          #${rootElementId} {
            height: 100%;
            overflow: hidden;
          }
          input, button, textarea, select {
            font-family: inherit;
            font-size: 100%;
            font-weight: inherit;
            line-height: inherit;
            color: inherit;
            margin: 0;
            padding: 0;
          }
          button, [role="button"] {
            cursor: pointer;
          }
          /* Ensure all elements are interactive */
          * {
            pointer-events: auto;
          }
          /* Focus styles */
          *:focus {
            outline: 2px solid transparent;
            outline-offset: 2px;
          }
          *:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 2px;
          }
        `;
        win.document.head.appendChild(tailwindBase);

        // Copy computed styles from body
        const computedStyles = window.getComputedStyle(document.body);
        const bodyStyles = `
          font-family: ${computedStyles.fontFamily};
          font-size: ${computedStyles.fontSize};
          line-height: ${computedStyles.lineHeight};
          color: ${computedStyles.color};
          background-color: ${computedStyles.backgroundColor};
        `;
        win.document.body.setAttribute('style', bodyStyles);

        // Copy theme classes
        const themeClasses = Array.from(document.documentElement.classList);
        themeClasses.forEach(className => {
          win.document.documentElement.classList.add(className);
        });

        // Copy data-theme attribute
        const dataTheme = document.documentElement.getAttribute('data-theme');
        if (dataTheme) {
          win.document.documentElement.setAttribute('data-theme', dataTheme);
        }

        // Wait for all styles to load
        await Promise.all(stylePromises);

        // Set up window event handlers
        ofWindow.on('closed', () => {
          windowRef.current = null;
          setPortalWindow(null);
          setPortalRoot(null);
          setIsReady(false);
          onOpenChange(false);
        });

        // Handle window focus/blur
        ofWindow.on('focused', () => {
          // Ensure parent window stays interactive
        });

        setPortalWindow(ofWindow);
        setPortalRoot(rootElement);
        setIsReady(true);

        // Show window after content is ready
        await ofWindow.show();
        await ofWindow.focus();

        if (onWindowCreated) {
          onWindowCreated(ofWindow);
        }

        // Cleanup function
        cleanup = () => {
          scriptsRef.current.forEach(script => script.remove());
          scriptsRef.current = [];
          if (styleElementRef.current) {
            styleElementRef.current.remove();
            styleElementRef.current = null;
          }
        };
      } catch (error) {
        console.error(`[OpenFinPortalDialog ${windowName}] Failed to create window:`, error);
        console.error(`[OpenFinPortalDialog ${windowName}] Error details:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        onOpenChange(false);
      } finally {
        isCreatingRef.current = false;
      }
    };

    const closeWindow = async () => {
      if (!open && portalWindow) {
        try {
          await portalWindow.close();
        } catch (error) {
          console.error('Failed to close window:', error);
        }
        setPortalWindow(null);
        setPortalRoot(null);
        setIsReady(false);
      }
    };

    if (open) {
      createWindow();
    } else {
      closeWindow();
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [open, windowName, onOpenChange, onWindowCreated, url, rootElementId]); // Removed dependencies that cause re-runs

  // Update theme in portal window when parent theme changes
  useEffect(() => {
    if (portalWindow && portalRoot) {
      const updateTheme = async () => {
        try {
          const win = await portalWindow.getWebWindow();
          
          // Copy theme classes
          const themeClasses = Array.from(document.documentElement.classList);
          win.document.documentElement.className = themeClasses.join(' ');
          
          // Copy data-theme attribute
          const dataTheme = document.documentElement.getAttribute('data-theme');
          if (dataTheme) {
            win.document.documentElement.setAttribute('data-theme', dataTheme);
          } else {
            win.document.documentElement.removeAttribute('data-theme');
          }
        } catch (error) {
          console.error('Failed to update theme:', error);
        }
      };

      updateTheme();
    }
  }, [portalWindow, portalRoot]);

  if (!open || !portalRoot || !isReady) {
    console.log(`[OpenFinPortalDialog ${windowName}] Not rendering portal - open:`, open, 'portalRoot:', !!portalRoot, 'isReady:', isReady);
    return null;
  }

  console.log(`[OpenFinPortalDialog ${windowName}] Rendering portal to window`);
  return ReactDOM.createPortal(children, portalRoot);
};

// Export a simpler hook for common use cases
export function useOpenFinPortal(windowName: string, windowOptions?: Partial<OpenFin.WindowOption>) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalWindow, setPortalWindow] = useState<OpenFin.Window | null>(null);

  const openPortal = () => setIsOpen(true);
  const closePortal = () => setIsOpen(false);

  const PortalComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <OpenFinPortalDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      windowName={windowName}
      windowOptions={windowOptions}
      onWindowCreated={setPortalWindow}
    >
      {children}
    </OpenFinPortalDialog>
  );

  return {
    isOpen,
    openPortal,
    closePortal,
    portalWindow,
    PortalComponent
  };
}