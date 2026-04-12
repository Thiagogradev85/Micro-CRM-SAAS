import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar.jsx'
import { WhatsAppProgressBar } from './components/WhatsAppProgressBar.jsx'
import { ClientsPage }      from './pages/ClientsPage.jsx'
import { ClientDetailPage } from './pages/ClientDetailPage.jsx'
import { CatalogPage }      from './pages/CatalogPage.jsx'
import { ProductsPage }     from './pages/ProductsPage.jsx'
import { SellersPage }      from './pages/SellersPage.jsx'
import { DailyReportPage }  from './pages/DailyReportPage.jsx'
import { WhatsAppPage }      from './pages/WhatsAppPage.jsx'
import { EmailPage }         from './pages/EmailPage.jsx'
import { ProspectingPage }   from './pages/ProspectingPage.jsx'
import { EnrichPage }        from './pages/EnrichPage.jsx'
import { SettingsPage }      from './pages/SettingsPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        <Sidebar />
        <WhatsAppProgressBar />
        <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
          <Routes>
            <Route path="/" element={<Navigate to="/clients" replace />} />
            <Route path="/clients"     element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/products"    element={<ProductsPage />} />
            <Route path="/catalogs"    element={<CatalogPage />} />
            <Route path="/sellers"     element={<SellersPage />} />
            <Route path="/daily-report" element={<DailyReportPage />} />
            <Route path="/whatsapp"      element={<WhatsAppPage />} />
            <Route path="/email"         element={<EmailPage />} />
            <Route path="/prospecting"   element={<ProspectingPage />} />
            <Route path="/enrich"        element={<EnrichPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
