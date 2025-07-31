/**
 * Get the base URL for the application
 * In OpenFin, views need the full URL including protocol and host
 */
export function getBaseUrl(): string {
  // In OpenFin provider window context
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Fallback for development
  return 'http://localhost:5173';
}

/**
 * Construct a full URL for OpenFin views
 * @param path - The path to append to the base URL (e.g., '/datagrid-stomp')
 * @returns The full URL
 */
export function getViewUrl(path: string): string {
  const baseUrl = getBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Check if running in OpenFin environment
 */
export function isOpenFinEnvironment(): boolean {
  return typeof fin !== 'undefined';
}