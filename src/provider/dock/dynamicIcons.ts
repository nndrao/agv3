/**
 * Utility functions for creating dynamic SVG icons for OpenFin dock buttons
 * Adapted from react-openfin-dock implementation with enhancements
 */

export interface DynamicIconOptions {
  text?: string;
  icon?: 'sun' | 'moon' | 'refresh' | 'devtools' | 'gear';
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  strokeWidth?: number;
}

/**
 * Create a dynamic SVG icon with text or predefined icon
 * @param options Configuration for the dynamic icon
 * @returns SVG data URL that can be used as iconUrl
 */
export function createDynamicIcon(options: DynamicIconOptions): string {
  const {
    text,
    icon,
    backgroundColor = 'transparent',
    textColor = '#FFFFFF',
    iconColor = '#666666',
    width = 24,
    height = 24,
    fontSize = 12,
    fontFamily = 'Arial, sans-serif',
    borderRadius = 4,
    strokeWidth = 2
  } = options;

  let content = '';

  if (text) {
    // Escape text for XML
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    content = `
      <text 
        x="${width / 2}" 
        y="${height / 2 + fontSize / 3}" 
        font-family="${fontFamily}" 
        font-size="${fontSize}" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${safeText}
      </text>
    `;
  } else if (icon) {
    // Predefined icon paths
    const iconPaths: Record<string, string> = {
      sun: `
        <circle cx="12" cy="12" r="5" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
        <line x1="12" y1="1" x2="12" y2="3" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="12" y1="21" x2="12" y2="23" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="1" y1="12" x2="3" y2="12" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="21" y1="12" x2="23" y2="12" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
      `,
      moon: `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
      `,
      refresh: `
        <polyline points="23 4 23 10 17 10" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
        <polyline points="1 20 1 14 7 14" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
      `,
      devtools: `
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
        <line x1="9" y1="9" x2="15" y2="9" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
        <line x1="9" y1="15" x2="15" y2="15" stroke="${iconColor}" stroke-width="${strokeWidth}"/>
      `,
      gear: `
        <circle cx="12" cy="12" r="3" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
        <path d="M12 1v6m0 6v6m-6-11.196L12 12l6-5.196M6 18.196L12 14l6 4.196" stroke="${iconColor}" stroke-width="${strokeWidth}" fill="none"/>
      `
    };

    content = iconPaths[icon] || '';
  }

  // Create SVG with dynamic content
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      ${backgroundColor !== 'transparent' ? `
        <rect 
          width="${width}" 
          height="${height}" 
          fill="${backgroundColor}" 
          rx="${borderRadius}" 
          ry="${borderRadius}"
        />
      ` : ''}
      ${content}
    </svg>
  `;

  // Convert to data URL
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * Create a theme-aware dynamic icon that adapts to light/dark mode
 * @param options Configuration for the dynamic icon
 * @param isDarkMode Whether the current theme is dark
 * @returns SVG data URL
 */
export function createThemeAwareIcon(
  options: DynamicIconOptions, 
  isDarkMode: boolean
): string {
  // Define theme-specific colors
  const themeColors = {
    dark: {
      background: '#383A40',
      text: '#FFFFFF',
      icon: '#FFFFFF'
    },
    light: {
      background: '#ECEEF1',
      text: '#1E1F23',
      icon: '#1E1F23'
    }
  };

  const theme = isDarkMode ? themeColors.dark : themeColors.light;

  const themeOptions = {
    ...options,
    backgroundColor: options.backgroundColor || theme.background,
    textColor: options.textColor || theme.text,
    iconColor: options.iconColor || theme.icon
  };

  return createDynamicIcon(themeOptions);
}

/**
 * Create colorful theme icons that are visible on both backgrounds
 * @param iconType The type of icon to create
 * @returns SVG data URL
 */
export function createColorfulIcon(iconType: 'sun' | 'moon' | 'refresh' | 'devtools' | 'gear'): string {
  const colorMap = {
    sun: '#F59E0B',      // Amber for sun
    moon: '#6366F1',     // Indigo for moon
    refresh: '#10B981',  // Green for refresh
    devtools: '#EF4444', // Red for devtools
    gear: '#8B5CF6'      // Purple for gear
  };

  return createDynamicIcon({
    icon: iconType,
    iconColor: colorMap[iconType],
    strokeWidth: 2.5
  });
}