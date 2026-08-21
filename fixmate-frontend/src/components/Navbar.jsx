import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Wrench, LogOut, LayoutDashboard, User, Trash2, X, Pencil, Check, RotateCcw } from 'lucide-react'
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

  // ── Email editing state ──────────────────────────────────────
  const [emailEditing, setEmailEditing] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

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
    setEmailEditing(false)
  }, [location.pathname])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setMenuOpen(false)
    navigate('/login')
  }, [navigate])

  // ── Delete account ───────────────────────────────────────────
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

  // ── Email editing ────────────────────────────────────────────
  const startEmailEdit = useCallback(() => {
    setEmailValue(user?.email || '')
    setEmailError('')
    setEmailSuccess('')
    setEmailEditing(true)
  }, [user])

  const cancelEmailEdit = useCallback(() => {
    setEmailEditing(false)
    setEmailError('')
    setEmailSuccess('')
  }, [])

  const saveEmail = useCallback(async () => {
    setEmailError('')
    setEmailSuccess('')

    const newEmail = emailValue.trim()

    // Frontend validation
    if (!newEmail) {
      setEmailError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    if (!newEmail.toLowerCase().endsWith('@gmail.com')) {
      setEmailError('Please enter a valid Gmail address.')
      return
    }
    if (user && newEmail.toLowerCase() === user.email.toLowerCase()) {
      setEmailError('This is already your current email address.')
      return
    }

    setEmailLoading(true)
    try {
      const { data } = await fetchWithAuth('/user/email', {
        method: 'PUT',
        body: JSON.stringify({ email: newEmail }),
      })
      if (!data.success) {
        setEmailError(data.message || 'Unable to update email. Please try again.')
        return
      }

      // Backend returns a new AuthenticationResponse with a fresh JWT.
      // Update localStorage so the app stays in sync.
      const updated = data.data
      if (updated?.token) {
        localStorage.setItem('token', updated.token)
      }
      // Rebuild the user object with the new email (and any other updated fields)
      const updatedUser = { ...user, email: updated.email, token: updated.token || user.token }
      localStorage.setItem('user', JSON.stringify(updatedUser))

      setEmailEditing(false)
      setEmailSuccess('Email updated successfully.')

      // Clear success message after 3 seconds
      setTimeout(() => setEmailSuccess(''), 3000)
    } catch (err) {
      setEmailError(err.message || 'Unable to update email. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }, [emailValue, user])

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  // ── Re-read user from localStorage after email update ────────
  // (re-parse so the displayed email reflects the latest state)
  const displayUser = (() => {
    const freshStr = localStorage.getItem('user')
    if (!freshStr) return user
    try { return JSON.parse(freshStr) } catch { return user }
  })()

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
                          {displayUser ? `${(displayUser.firstName || '')[0] || ''}${(displayUser.lastName || '')[0] || ''}`.toUpperCase() : '?'}
                        </div>
                        <div className="profile-info">
                          <span className="profile-name">{displayUser?.firstName} {displayUser?.lastName}</span>
                          {displayUser?.phone && <span className="profile-phone">{displayUser.phone}</span>}
                          <span className="profile-role">{ROLE_LABELS[role] || 'User'}</span>
                        </div>
                      </div>

                      <div className="profile-dropdown-divider" />

                      {/* ── Editable email row ─────────────────────── */}
                      <div className="profile-email-row">
                        {emailEditing ? (
                          <div className="email-edit-wrap">
                            <input
                              type="text"
                              className="form-input email-edit-input"
                              value={emailValue}
                              onChange={(e) => setEmailValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEmail()
                                if (e.key === 'Escape') cancelEmailEdit()
                              }}
                              placeholder="newemail@gmail.com"
                              autoFocus
                            />
                            <div className="email-edit-actions">
                              <button
                                className="email-edit-btn email-save"
                                onClick={saveEmail}
                                disabled={emailLoading}
                                title="Save"
                              >
                                {emailLoading ? <RotateCcw size={13} className="spin" /> : <Check size={13} />}
                              </button>
                              <button
                                className="email-edit-btn email-cancel"
                                onClick={cancelEmailEdit}
                                disabled={emailLoading}
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            {emailError && <span className="email-edit-error">{emailError}</span>}
                          </div>
                        ) : (
                          <div className="email-display-row">
                            <span className="profile-email-label">Email</span>
                            <span className="profile-email-value">{displayUser?.email}</span>
                            <button className="email-edit-trigger" onClick={startEmailEdit} title="Edit email">
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                        {emailSuccess && !emailEditing && (
                          <span className="email-edit-success">{emailSuccess}</span>
                        )}
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
                  placeholder={displayUser?.email || 'your@gmail.com'}
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
