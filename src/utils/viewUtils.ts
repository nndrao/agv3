import { v4 as uuidv4 } from 'uuid';

/**
 * Get the view instance ID from query parameters
 * @returns The view instance ID or a generated UUID if not found
 */
export function getViewInstanceId(): string {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  
  if (!id) {
    console.warn('[getViewInstanceId] No ID found in query parameters, generating default');
    return uuidv4();
  }
  
  return id;
}

/**
 * Check if running in OpenFin environment
 * @returns True if running in OpenFin
 */
export function isOpenFin(): boolean {
  return typeof window !== 'undefined' && 'fin' in window;
}

/**
 * Get the current view name from OpenFin
 * @returns The view name or null if not in OpenFin
 */
export async function getOpenFinViewName(): Promise<string | null> {
  if (!isOpenFin()) return null;
  
  try {
    const view = await fin.View.getCurrent();
    return view.identity.name;
  } catch (error) {
    console.error('[getOpenFinViewName] Failed to get view name:', error);
    return null;
  }
}

/**
 * Get the current window name from OpenFin
 * @returns The window name or null if not in OpenFin
 */
export async function getOpenFinWindowName(): Promise<string | null> {
  if (!isOpenFin()) return null;
  
  try {
    const window = await fin.Window.getCurrent();
    return window.identity.name;
  } catch (error) {
    console.error('[getOpenFinWindowName] Failed to get window name:', error);
    return null;
  }
}