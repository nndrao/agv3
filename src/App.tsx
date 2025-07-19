import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { Footer } from '@/components/footer';
import DataGridWrapper from "./windows/datagrid/DataGridWrapper";
import { App as DatasourceConfigApp } from './windows/datasource-config/App';
import { App as ProviderStatusApp } from './windows/provider-status/App';

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
        <Route path="/datatable" element={<div style={{ height: "100vh", width: "100vw" }}><DataGridWrapper /></div>} />
        <Route path="/datasource-config" element={<DatasourceConfigApp />} />
        <Route path="/provider-status" element={<ProviderStatusApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;