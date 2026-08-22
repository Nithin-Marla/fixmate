import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Wrench, LayoutDashboard, Briefcase, IndianRupee, User,
  ShieldCheck, Settings, LogOut, Users, FileCheck2, Clock,
  Star, ScrollText, Bell, ChevronRight
} from 'lucide-react'
import ThemeToggle from './ui/ThemeToggle'

const ROLE_CONFIG = {
  ROLE_SERVICE_PARTNER: {
    sections: [
      {
        label: 'Work',
        items: [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'jobs', label: 'My Jobs', icon: Briefcase },
          { id: 'earnings', label: 'Earnings', icon: IndianRupee },
        ]
      },
      {
        label: 'Account',
        items: [
          { id: 'profile', label: 'Profile & KYC', icon: ShieldCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ]
      }
    ]
  },
  ROLE_ADMIN: {
    sections: [
      {
        label: 'Platform',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'partners', label: 'Partners', icon: Briefcase },
        ]
      },
      {
        label: 'Operations',
        items: [
          { id: 'bookings', label: 'Bookings', icon: Clock },
          { id: 'kyc', label: 'KYC Review', icon: FileCheck2 },
          { id: 'audit', label: 'Audit Logs', icon: ScrollText },
        ]
      },
      {
        label: 'Settings',
        items: [
          { id: 'settings', label: 'Settings', icon: Settings },
        ]
      }
    ]
  }
}

export default function Sidebar({ role, activeSection, onSectionChange, unreadCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.ROLE_ADMIN
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()

  const initials = user ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() : '?'
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User'
  const roleLabel = role === 'ROLE_SERVICE_PARTNER' ? 'Service Partner' : 'Administrator'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <Link to={role === 'ROLE_SERVICE_PARTNER' ? '/partner/dashboard' : '/admin/dashboard'} className="sidebar-logo">
          <span className="sidebar-logo-icon"><Wrench size={16} /></span>
          <span>FixMate</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {config.sections.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <span className="sidebar-item-icon"><Icon size={18} /></span>
                  <span>{item.label}</span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="sidebar-item-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <ThemeToggle />
          <button className="topbar-icon-btn" onClick={handleLogout} title="Log out" style={{ border: 'none', background: 'var(--surface-hover)' }}>
            <LogOut size={16} />
          </button>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
