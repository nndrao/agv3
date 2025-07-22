/**
 * Utility for managing view titles in OpenFin
 */

export class ViewTitleManager {
  /**
   * Get the current view name from OpenFin
   */
  static async getViewName(): Promise<string | null> {
    try {
      if (typeof fin !== 'undefined') {
        // First try to get the current view
        try {
          const currentView = await fin.View.getCurrent();
          const viewInfo = await currentView.getInfo();
          return viewInfo.name || viewInfo.viewName || null;
        } catch (e) {
          // Fallback to fin.me
          const info = await fin.me.getInfo();
          return info.viewName || info.name || null;
        }
      }
    } catch (error) {
      console.warn('[ViewTitleManager] Could not get view name:', error);
    }
    return null;
  }

  /**
   * Save a custom title for the current view
   */
  static async saveTitle(title: string, viewName?: string): Promise<void> {
    const name = viewName || await this.getViewName();
    if (name && window.localStorage) {
      localStorage.setItem(`viewTitle_${name}`, title);
      console.log(`[ViewTitleManager] Saved title "${title}" for view "${name}"`);
      
      // Also try to update the current view's title immediately
      try {
        const currentView = await fin.View.getCurrent();
        await currentView.updateOptions({ 
          title: title,
          titleOrder: 'options'
        });
      } catch (e) {
        console.warn('[ViewTitleManager] Could not update view options:', e);
      }
    }
  }

  /**
   * Get the saved title for the current view
   */
  static async getSavedTitle(viewName?: string): Promise<string | null> {
    const name = viewName || await this.getViewName();
    if (name && window.localStorage) {
      const savedTitle = localStorage.getItem(`viewTitle_${name}`);
      if (savedTitle) {
        console.log(`[ViewTitleManager] Retrieved saved title "${savedTitle}" for view "${name}"`);
        return savedTitle;
      }
    }
    return null;
  }

  /**
   * Set the document title and optionally save it
   */
  static async setTitle(title: string, save: boolean = true): Promise<void> {
    document.title = title;
    if (save) {
      await this.saveTitle(title);
    }
  }

  /**
   * Restore the saved title or set a default
   */
  static async restoreTitle(defaultTitle: string): Promise<void> {
    try {
      const savedTitle = await this.getSavedTitle();
      if (savedTitle) {
        document.title = savedTitle;
        console.log(`[ViewTitleManager] Restored title: "${savedTitle}"`);
      } else {
        document.title = defaultTitle;
        console.log(`[ViewTitleManager] Set default title: "${defaultTitle}"`);
      }
    } catch (error) {
      console.warn('[ViewTitleManager] Error restoring title:', error);
      document.title = defaultTitle;
    }
  }

  /**
   * Clear the saved title for the current view
   */
  static async clearSavedTitle(): Promise<void> {
    const viewName = await this.getViewName();
    if (viewName && window.localStorage) {
      localStorage.removeItem(`viewTitle_${viewName}`);
      console.log(`[ViewTitleManager] Cleared saved title for view "${viewName}"`);
    }
  }
}