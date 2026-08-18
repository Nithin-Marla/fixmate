import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Wrench, LogOut, LayoutDashboard } from 'lucide-react'
import './Navbar.css'

const ROLE_LABELS = {
  ROLE_CUSTOMER: 'Customer',
  ROLE_SERVICE_PARTNER: 'Service Partner',
  ROLE_ADMIN: 'Administrator'
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;
  let role = null;
  if (token && userStr) {
    try {
      user = JSON.parse(userStr);
      role = Array.isArray(user.roles) ? user.roles[0] : user.role;
    } catch {
      // ignore malformed storage
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
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
              <span className="nav-role-chip">
                {ROLE_LABELS[role] || 'User'}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm nav-logout">
                <LogOut size={14} /> Logout
              </button>
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
  )
}
