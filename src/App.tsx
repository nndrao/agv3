import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { Footer } from '@/components/footer';
import { DataGridStomp, DataGridStompShared } from "./windows/datagrid/components";
import { App as DatasourceConfigApp } from './windows/datasource-config/App';
import { App as ProviderStatusApp } from './windows/provider-status/App';
import { RenameDialogApp } from './windows/rename-dialog/RenameDialogApp';
import { DialogDemo } from '@/components/expression-editor/DialogDemo';
import { ConditionalFormattingApp } from './windows/conditional-formatting/ConditionalFormattingApp';
import { GridOptionsApp } from './windows/grid-options/GridOptionsApp';
import { ColumnGroupsApp } from './windows/column-groups/ColumnGroupsApp';

// Register AG-Grid Enterprise modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Landing page component
function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main landing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* OpenFin window routes */}
        <Route path="/datagrid-stomp" element={<div className="h-screen w-screen"><DataGridStomp /></div>} />
        <Route path="/datagrid-stomp-shared" element={<div className="h-screen w-screen"><DataGridStompShared /></div>} />
        <Route path="/datasource-config" element={<DatasourceConfigApp />} />
        <Route path="/provider-status" element={<ProviderStatusApp />} />
        <Route path="/rename-dialog" element={<RenameDialogApp />} />
        
        {/* Expression Editor Demo */}
        <Route path="/expression-editor" element={<DialogDemo />} />
        
        {/* Conditional Formatting */}
        <Route
          path="/conditional-formatting"
          element={
            <div className="h-screen w-screen">
              <ConditionalFormattingApp />
            </div>
          }
        />
        
        {/* Grid Options */}
        <Route
          path="/grid-options"
          element={
            <div className="h-screen w-screen">
              <GridOptionsApp />
            </div>
          }
        />
        
        {/* Column Groups */}
        <Route
          path="/column-groups"
          element={
            <div className="h-screen w-screen">
              <ColumnGroupsApp />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;