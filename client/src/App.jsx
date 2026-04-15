import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { WhatsAppProgressBar } from './components/WhatsAppProgressBar.jsx'
import { LoginPage }       from './pages/LoginPage.jsx'
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
import { AdminUsersPage }    from './pages/AdminUsersPage.jsx'
import { AdminCompaniesPage } from './pages/AdminCompaniesPage.jsx'

function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <WhatsAppProgressBar />
      <main className="flex-1 overflow-y-auto pt-8 md:pt-0">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/clients" replace />} />
                    <Route path="/clients"      element={<ClientsPage />} />
                    <Route path="/clients/:id"  element={<ClientDetailPage />} />
                    <Route path="/products"     element={<ProductsPage />} />
                    <Route path="/catalogs"     element={<CatalogPage />} />
                    <Route path="/sellers"      element={<SellersPage />} />
                    <Route path="/daily-report" element={<DailyReportPage />} />
                    <Route path="/whatsapp"     element={<WhatsAppPage />} />
                    <Route path="/email"        element={<EmailPage />} />
                    <Route path="/prospecting"  element={<ProspectingPage />} />
                    <Route path="/enrich"       element={<EnrichPage />} />
                    <Route path="/settings"     element={<SettingsPage />} />
                    <Route path="/admin/users"     element={<AdminUsersPage />} />
                    <Route path="/admin/companies" element={<AdminCompaniesPage />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
