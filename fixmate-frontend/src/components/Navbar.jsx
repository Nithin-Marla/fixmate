import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Wrench, LogOut, LayoutDashboard, User, Trash2, X } from 'lucide-react'
import { fetchWithAuth } from '../api'
import './Navbar.css'

const ROLE_LABELS = {
  ROLE_CUSTOMER: 'Customer',
  ROLE_SERVICE_PARTNER: 'Service Partner',
  ROLE_ADMIN: 'Administrator',
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const menuRef = useRef(null)

  let user = null
  let role = null
  if (token && userStr) {
    try {
      user = JSON.parse(userStr)
      role = Array.isArray(user.roles) ? user.roles[0] : user.role
    } catch {
      /* ignore */
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  // Close dropdown on navigation
  useEffect(() => {
    setMenuOpen(false)
    setDeleteOpen(false)
  }, [location.pathname])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setMenuOpen(false)
    navigate('/login')
  }, [navigate])

  const openDelete = useCallback(() => {
    setDeleteEmail('')
    setDeletePassword('')
    setDeleteError('')
    setDeleteLoading(false)
    setDeleteOpen(true)
    setMenuOpen(false)
  }, [])

  const closeDelete = useCallback(() => {
    setDeleteOpen(false)
    setDeleteError('')
  }, [])

  const handleDeleteAccount = useCallback(async (e) => {
    e.preventDefault()
    setDeleteError('')

    if (!deleteEmail.trim()) {
      setDeleteError('Please enter your email address.')
      return
    }
    if (!deletePassword) {
      setDeleteError('Please enter your password.')
      return
    }
    if (user && deleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('Email does not match the logged-in account.')
      return
    }

    setDeleteLoading(true)
    try {
      const { data } = await fetchWithAuth('/user/account', {
        method: 'DELETE',
        body: JSON.stringify({ email: deleteEmail.trim(), password: deletePassword }),
      })
      if (!data.success) {
        setDeleteError(data.message || 'Account could not be deleted.')
        return
      }
      // Success: clear everything and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setDeleteOpen(false)
      navigate('/register')
    } catch (err) {
      setDeleteError(err.message || 'Account could not be deleted. Please try again later.')
    } finally {
      setDeleteLoading(false)
    }
  }, [deleteEmail, deletePassword, user, navigate])

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  return (
    <>
      <header className="navbar-glass">
        <div className="container navbar-container">
          <Link to={token ? '/' : '/login'} className="navbar-brand">
            <span className="brand-logo">
              <Wrench size={20} />
            </span>
            <span className="brand-text">FixMate</span>
          </Link>

          <nav className="navbar-nav" aria-label="Main navigation">
            {!token ? (
              <>
                <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'nav-link-active' : ''}`}>Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Create Account</Link>
              </>
            ) : (
              <>
                {role === 'ROLE_CUSTOMER' && (
                  <Link to="/customer/dashboard" className="nav-link nav-link-with-icon">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                )}
                {role === 'ROLE_SERVICE_PARTNER' && (
                  <Link to="/partner/dashboard" className="nav-link nav-link-with-icon">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                )}
                {role === 'ROLE_ADMIN' && (
                  <Link to="/admin/dashboard" className="nav-link nav-link-with-icon">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                )}

                {/* ── Profile icon + dropdown ───────────────────────── */}
                <div className="nav-profile-wrap" ref={menuRef}>
                  <button
                    className="nav-profile-btn"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="Profile menu"
                    aria-expanded={menuOpen}
                  >
                    <User size={18} />
                  </button>

                  {menuOpen && (
                    <div className="profile-dropdown">
                      <div className="profile-dropdown-header">
                        <div className="profile-avatar">
                          {user ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() : '?'}
                        </div>
                        <div className="profile-info">
                          <span className="profile-name">{user?.firstName} {user?.lastName}</span>
                          <span className="profile-email">{user?.email}</span>
                          {user?.phone && <span className="profile-phone">{user.phone}</span>}
                          <span className="profile-role">{ROLE_LABELS[role] || 'User'}</span>
                        </div>
                      </div>

                      <div className="profile-dropdown-divider" />

                      <button className="profile-dropdown-item profile-logout" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                      </button>
                      <button className="profile-dropdown-item profile-delete" onClick={openDelete}>
                        <Trash2 size={16} /> Delete Account
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>

        {isAuthPage && (
          <div className="navbar-auth-badge">
            <span className="dot dot-green" /> Verified local professionals
          </div>
        )}
      </header>

      {/* ── Delete Account Confirmation Modal ────────────────────── */}
      {deleteOpen && (
        <div className="modal-overlay" onClick={closeDelete}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDelete} aria-label="Close">
              <X size={18} />
            </button>

            <h3 className="modal-title">Delete Account</h3>
            <p className="modal-desc">
              This action permanently deletes your FixMate account and cannot be undone.
            </p>

            {deleteError && <div className="alert alert-danger">{deleteError}</div>}

            <form onSubmit={handleDeleteAccount} className="modal-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder={user?.email || 'your@gmail.com'}
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary modal-cancel"
                  onClick={closeDelete}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger modal-confirm-delete"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
