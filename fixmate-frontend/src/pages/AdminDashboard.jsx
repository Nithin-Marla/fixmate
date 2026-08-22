import React, { useEffect, useState } from 'react'
import { Users, Briefcase, FileCheck2, CheckCircle2, Siren, IndianRupee, ShieldAlert, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '../api'
import StatCard from '../components/ui/StatCard'
import AdminManagement from '../components/AdminManagement'
import { SkeletonLine } from '../components/ui/Skeleton'
import './Dashboard.css'

export default function AdminDashboard({ activeSection }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isOverview = !activeSection || activeSection === 'overview'

  useEffect(() => { loadAnalytics() }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { data } = await fetchWithAuth('/admin/dashboard')
      if (data.success) setAnalytics(data.data)
      else setError(data.message || 'Failed to load analytics')
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const totalUsers = (analytics?.totalCustomers || 0) + (analytics?.totalServicePartners || 0)

  // For management sections, pass the active section to AdminManagement
  const mgmtTab = ['customers', 'partners', 'bookings', 'kyc', 'audit'].includes(activeSection) ? activeSection : null

  return (
    <div className="dashboard-container">
      <div className="page-header glass-panel">
        <div>
          <h2>{isOverview ? 'Platform Overview' : 'Management Console'}</h2>
          <p className="subtitle">{isOverview ? 'Analytics & operations at a glance' : 'Manage users, partners, and bookings'}</p>
        </div>
        <div className="page-header-actions">
          {!loading && !error && (
            <button type="button" className="btn btn-outline btn-sm" onClick={loadAnalytics}>
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {isOverview ? (
        loading ? (
          <div className="grid grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <SkeletonLine width="60%" height="0.9rem" />
                <SkeletonLine width="40%" height="1.6rem" style={{ marginTop: '0.7rem' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <ShieldAlert size={22} />
              </div>
              <h4>Unable to load analytics</h4>
              <p>{error}</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={loadAnalytics}>
                Try again
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
              <StatCard
                icon={<Users size={20} />}
                label="Total Users"
                value={totalUsers}
                sub={`${analytics.totalCustomers} customers · ${analytics.totalServicePartners} partners`}
                color="var(--primary)"
                bg="var(--primary-soft)"
              />
              <StatCard
                icon={<FileCheck2 size={20} />}
                label="Pending KYC"
                value={analytics.pendingKycApprovals}
                sub="partners awaiting verification"
                color="var(--warning)"
                bg="var(--warning-light)"
              />
              <StatCard
                icon={<IndianRupee size={20} />}
                label="Revenue"
                value={`₹${Number(analytics.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                sub="across all completed bookings"
                color="var(--success)"
                bg="var(--success-light)"
              />
              <StatCard
                icon={<Briefcase size={20} />}
                label="Total Bookings"
                value={analytics.totalBookings}
                sub="all time"
                color="var(--accent)"
                bg="var(--accent-light)"
              />
              <StatCard
                icon={<CheckCircle2 size={20} />}
                label="Completed"
                value={analytics.completedBookings}
                sub={`${analytics.totalBookings ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100) : 0}% completion rate`}
                color="var(--info)"
                bg="var(--info-light)"
              />
              <StatCard
                icon={<Siren size={20} />}
                label="Emergency"
                value={analytics.emergencyBookings}
                sub="instant requests"
                color="var(--danger)"
                bg="var(--danger-light)"
              />
            </div>

            <div className="dashboard-content glass-panel">
              <div className="section-head">
                <h3>Platform Snapshot</h3>
              </div>
              <div className="grid grid-3">
                {[
                  { label: 'Customers', value: analytics.totalCustomers, pct: totalUsers ? Math.round((analytics.totalCustomers / totalUsers) * 100) : 0, color: 'var(--primary)' },
                  { label: 'Service Partners', value: analytics.totalServicePartners, pct: totalUsers ? Math.round((analytics.totalServicePartners / totalUsers) * 100) : 0, color: 'var(--accent)' },
                  { label: 'Pending KYC', value: analytics.pendingKycApprovals, pct: analytics.totalServicePartners ? Math.round((analytics.pendingKycApprovals / analytics.totalServicePartners) * 100) : 0, color: 'var(--warning)' }
                ].map((seg) => (
                  <div key={seg.label} className="card">
                    <div className="stat-label">{seg.label}</div>
                    <div className="stat-value" style={{ color: seg.color }}>{seg.value}</div>
                    <div className="rating-dist-bar" style={{ marginTop: '0.75rem' }}>
                      <div className="rating-dist-fill" style={{ width: `${seg.pct}%`, background: seg.color }} />
                    </div>
                    <div className="stat-sub" style={{ marginTop: '0.4rem' }}>{seg.pct}% of platform</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      ) : (
        <div className="glass-panel" style={{ padding: '1.75rem 2rem' }}>
          <AdminManagement initialTab={mgmtTab} />
        </div>
      )}
    </div>
  )
}
