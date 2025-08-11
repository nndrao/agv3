/**
 * OpenFin-Adapted UI Components
 * 
 * These components are portal-less versions of standard shadcn/ui components,
 * designed specifically for use in OpenFin multi-window applications.
 * 
 * When to use:
 * - In OpenFin child windows (dialogs opened from main application)
 * - In floating panels that become separate windows
 * - When dropdowns must stay within their originating window
 * 
 * These components maintain identical APIs to their standard counterparts
 * but render content within the current window instead of using React portals.
 */

// Export all OpenFin-adapted components
export * from './openfin-select';
export * from './openfin-dropdown-menu';
export * from './openfin-popover';
export * from './openfin-tooltip';
export * from './openfin-hover-card';
export * from './openfin-command';
export * from './openfin-context-menu';
export * from './openfin-menubar';
export * from './openfin-dialog';
export * from './openfin-alert-dialog';
export * from './openfin-sheet';

// Re-export utility for determining when to use OpenFin components
export { useIsOpenFinWindow, getContextualComponent } from './use-is-openfin-window';