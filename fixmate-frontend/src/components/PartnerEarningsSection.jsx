import React, { useState, useEffect } from 'react'
import { IndianRupee, TrendingUp, Users, Star, BarChart3 } from 'lucide-react'
import { fetchWithAuth } from '../api'
import { SkeletonLine } from './ui/Skeleton'

export default function PartnerEarningsSection() {
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadEarnings() }, [])

  const loadEarnings = async () => {
    try {
      const { data } = await fetchWithAuth('/partner/earnings')
      if (data.success) setEarnings(data.data)
    } catch {
      // Earnings endpoint may not be available yet
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-content glass-panel" style={{ marginBottom: '1.5rem' }}>
        <SkeletonLine width="40%" height="1rem" />
        <div className="earnings-grid" style={{ marginTop: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!earnings) return null

  const maxDaily = Math.max(...(earnings.recentDailyEarnings || []).map(d => d.earnings || 0), 1)

  return (
    <div className="dashboard-content glass-panel" style={{ marginBottom: '1.5rem' }}>
      <div className="section-head">
        <div>
          <div className="section-title">Earnings Overview</div>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Your performance at a glance</p>
        </div>
      </div>

      <div className="earnings-grid">
        <div className="earnings-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="earnings-card-label">Total Earnings</div>
          <div className="earnings-card-value" style={{ color: 'var(--success-dark)' }}>
            ₹{Number(earnings.totalEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="earnings-card-sub">Lifetime earnings</div>
        </div>
        <div className="earnings-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="earnings-card-label">Net Earnings</div>
          <div className="earnings-card-value" style={{ color: 'var(--primary)' }}>
            ₹{Number(earnings.netEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="earnings-card-sub">After platform fees</div>
        </div>
        <div className="earnings-card" style={{ borderLeft: '3px solid var(--info)' }}>
          <div className="earnings-card-label">Completed Jobs</div>
          <div className="earnings-card-value">{earnings.totalCompletedBookings || 0}</div>
          <div className="earnings-card-sub">{earnings.totalCustomersServed || 0} customers served</div>
        </div>
        <div className="earnings-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="earnings-card-label">Average Rating</div>
          <div className="earnings-card-value">⭐ {earnings.averageRating != null ? Number(earnings.averageRating).toFixed(1) : '—'}</div>
          <div className="earnings-card-sub">Smart Service Score</div>
        </div>
      </div>

      {/* Daily Earnings Chart (simple bar chart) */}
      {earnings.recentDailyEarnings && earnings.recentDailyEarnings.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div className="stat-label" style={{ marginBottom: '0.6rem' }}>Last 7 Days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: '80px' }}>
            {earnings.recentDailyEarnings.map((day, i) => {
              const pct = maxDaily > 0 ? (day.earnings / maxDaily) * 100 : 0
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {day.earnings > 0 ? `₹${day.earnings}` : ''}
                  </span>
                  <div style={{
                    width: '100%', maxWidth: '40px', height: `${Math.max(pct, 4)}%`,
                    background: day.earnings > 0 ? 'var(--primary)' : 'var(--border)',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    transition: 'height 0.3s ease'
                  }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{day.date?.split(' ')[1] || ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
