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
      </Routes>
    </BrowserRouter>
  );
}

export default App;