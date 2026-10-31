import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import SampleAnalysis from './pages/SampleAnalysis'
import History from './pages/History'
import ModelEvaluation from './pages/ModelEvaluation'
import DemoLab from './pages/DemoLab'
import AnalysisDetail from './pages/AnalysisDetail'
import Styleguide from './pages/Styleguide'
import EmptyState from './components/EmptyState'

function Layout({ children }) {
  const location = useLocation()

  const getPageTitle = (path) => {
    if (path === '/') return 'SOC Dashboard'
    if (path === '/analyze') return 'Sample Analysis & Inspection'
    if (path.startsWith('/analysis/')) return 'Analysis Details & Evidence'
    if (path === '/demo') return 'Demo Simulation Lab'
    if (path === '/history') return 'Detection History & Catalog'
    if (path === '/model') return 'ML Model Evaluation'
    if (path === '/styleguide') return 'Design System Styleguide'
    return 'TrojanGuard EDR / SOC'
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="space-y-4">
      <EmptyState
        title="404 — Not Found"
        description="The requested SOC console route does not exist."
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyze" element={<SampleAnalysis />} />
          <Route path="/analysis/:id" element={<AnalysisDetail />} />
          <Route path="/demo" element={<DemoLab />} />
          <Route path="/history" element={<History />} />
          <Route path="/model" element={<ModelEvaluation />} />
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
