import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerDashboard from './pages/CustomerDashboard'
import PartnerDashboard from './pages/PartnerDashboard'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/customer/dashboard" 
              element={
                <ProtectedRoute allowedRole="ROLE_CUSTOMER">
                  <CustomerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/partner/dashboard" 
              element={
                <ProtectedRoute allowedRole="ROLE_SERVICE_PARTNER">
                  <PartnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRole="ROLE_ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
