import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { Footer } from '@/components/footer';
import { App as DataTableApp } from './windows/datatable/App';
import { App as DatasourceConfigApp } from './windows/datasource-config/App';
import { App as ProviderStatusApp } from './windows/provider-status/App';

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
        <Route path="/datatable" element={<DataTableApp />} />
        <Route path="/datasource-config" element={<DatasourceConfigApp />} />
        <Route path="/provider-status" element={<ProviderStatusApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;