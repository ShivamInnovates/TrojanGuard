import React from 'react'
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Styleguide from './pages/Styleguide'
import DemoLab from './pages/DemoLab'
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

function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-4">
      <EmptyState
        title={title}
        description={description}
      />
    </div>
  )
}

function AnalysisRoutePlaceholder() {
  const { id } = useParams()
  return (
    <PlaceholderPage
      title={`Analysis Report #${id}`}
      description="Detailed analysis breakdown, static inspection, extracted features, IOCs, and explainable evidence view."
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <PlaceholderPage
                title="SOC Dashboard"
                description="Live security metrics, classification breakdown, detection volume timeline, and network activity."
              />
            }
          />
          <Route
            path="/analyze"
            element={
              <PlaceholderPage
                title="Sample Analysis"
                description="Safe in-memory upload of executable binaries or documents for static and heuristic threat evaluation."
              />
            }
          />
          <Route path="/analysis/:id" element={<AnalysisRoutePlaceholder />} />
          <Route path="/demo" element={<DemoLab />} />
          <Route
            path="/history"
            element={
              <PlaceholderPage
                title="Detection History"
                description="Full catalog of evaluated samples with search, classification filtering, severity sorting, and pagination."
              />
            }
          />
          <Route
            path="/model"
            element={
              <PlaceholderPage
                title="Model Evaluation"
                description="Random Forest classifier metrics, confusion matrix, ROC-AUC curves, and synthetic dataset distribution."
              />
            }
          />
          <Route path="/styleguide" element={<Styleguide />} />
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="404 — Not Found"
                description="The requested SOC console route does not exist."
              />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
