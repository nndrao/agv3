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
  onWindowCreated
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
    // Only run if open state actually changed
    if (previousOpenRef.current !== null && open === previousOpenRef.current) {
      return;
    }
    previousOpenRef.current = open;

    let cleanup: (() => void) | undefined;

    const createWindow = async () => {
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
        // Check if window already exists by name
        let ofWindow: OpenFin.Window;
        try {
          ofWindow = await fin.Window.wrapSync({ uuid: fin.me.uuid, name: windowName });
          // Window exists, bring it to front
          await ofWindow.focus();
          await ofWindow.bringToFront();
          windowRef.current = ofWindow;
        } catch {
          // Window doesn't exist, create it
          const finalOptions: OpenFin.WindowOption = {
            ...defaultWindowOptions,
            ...windowOptions,
            name: windowName,
            url: getViewUrl('/grid-options-window.html'),
          };

          ofWindow = await fin.Window.create(finalOptions);
          windowRef.current = ofWindow;
        }

        // Wait for the window to be ready
        await new Promise<void>((resolve) => {
          const checkReady = async () => {
            try {
              const win = await ofWindow.getWebWindow();
              if (win && win.document && win.document.readyState === 'complete') {
                resolve();
              } else {
                setTimeout(checkReady, 50);
              }
            } catch {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        });

        const win = await ofWindow.getWebWindow();
        const rootElement = win.document.getElementById('grid-options-root');
        
        if (!rootElement) {
          throw new Error('Portal root element not found');
        }

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
          #grid-options-root {
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
        console.error('Failed to create OpenFin portal window:', error);
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
  }, [open, windowName, onOpenChange, onWindowCreated]); // Removed dependencies that cause re-runs

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
    return null;
  }

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