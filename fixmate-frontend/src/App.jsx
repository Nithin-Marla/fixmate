import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import ThemeToggle, { getStoredTheme } from './components/ui/ThemeToggle'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerDashboard from './pages/CustomerDashboard'
import PartnerDashboard from './pages/PartnerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import LandingPage from './pages/LandingPage'

function App() {
  const [partnerSection, setPartnerSection] = useState('dashboard')
  const [adminSection, setAdminSection] = useState('overview')

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', getStoredTheme())
  }, [])

  return (
    <Router>
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer — top navbar layout */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRole="ROLE_CUSTOMER">
                <Navbar />
                <main className="main-content">
                  <CustomerDashboard />
                </main>
              </ProtectedRoute>
            }
          />

          {/* Partner — sidebar layout */}
          <Route
            path="/partner/dashboard"
            element={
              <ProtectedRoute allowedRole="ROLE_SERVICE_PARTNER">
                <div className="app-shell">
                  <Sidebar
                    role="ROLE_SERVICE_PARTNER"
                    activeSection={partnerSection}
                    onSectionChange={setPartnerSection}
                  />
                  <div className="app-main">
                    <main className="app-body">
                      <PartnerDashboard activeSection={partnerSection} onSectionChange={setPartnerSection} />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Admin — sidebar layout */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <div className="app-shell">
                  <Sidebar
                    role="ROLE_ADMIN"
                    activeSection={adminSection}
                    onSectionChange={setAdminSection}
                  />
                  <div className="app-main">
                    <main className="app-body">
                      <AdminDashboard activeSection={adminSection} onSectionChange={setAdminSection} />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
