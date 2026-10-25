import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages — imported as they are built in Phase 6.
// Placeholder components keep the router runnable at Phase 1.
const Placeholder = ({ name }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
  }}>
    🛡 TrojanGuard — <strong style={{ color: 'var(--color-accent)', marginLeft: '0.5ch' }}>{name}</strong>&nbsp;(Phase 6)
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="/analyze"   element={<Placeholder name="Sample Analysis" />} />
        <Route path="/results/:id" element={<Placeholder name="Analysis Results" />} />
        <Route path="/demo"      element={<Placeholder name="Demo Lab" />} />
        <Route path="/history"   element={<Placeholder name="History" />} />
        <Route path="/model"     element={<Placeholder name="Model Evaluation" />} />
        <Route path="*"          element={<Placeholder name="404 — Not Found" />} />
      </Routes>
    </BrowserRouter>
  )
}
