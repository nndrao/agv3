import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import DataGridSimple from './components/DataGridSimple';

export function DataGridWrapper() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="agv3-ui-theme">
      <DataGridSimple />
    </ThemeProvider>
  );
}

export default DataGridWrapper;