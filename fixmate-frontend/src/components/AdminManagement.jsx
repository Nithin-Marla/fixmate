import React, { useState, useEffect, useCallback } from 'react'
import {
  Users, Briefcase, FileCheck2, Shield, Clock, Eye,
  CheckCircle2, XCircle, Search, RefreshCw, ChevronDown, ChevronUp, ScrollText, Trash2
} from 'lucide-react'
import { fetchWithAuth } from '../api'
import { SkeletonList } from './ui/Skeleton'
import LiveTrackingMap from './LiveTrackingMap'
import './AdminManagement.css'

const TABS = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'partners', label: 'Partners', icon: Briefcase },
  { id: 'bookings', label: 'Bookings', icon: Clock },
  { id: 'kyc', label: 'KYC Review', icon: Shield },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
]

export default function AdminManagement({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'customers')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [kycActionLoading, setKycActionLoading] = useState(null)
  const [userActionLoading, setUserActionLoading] = useState(null)
  const [trackingBookingId, setTrackingBookingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, name }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setData([])
    try {
      let endpoint = ''
      switch (activeTab) {
        case 'customers': endpoint = '/admin/customers'; break
        case 'partners': endpoint = '/admin/partners'; break
        case 'bookings': endpoint = '/admin/bookings'; break
        case 'kyc': endpoint = '/admin/kyc/pending'; break
        case 'audit': endpoint = '/admin/audit-logs?page=0&size=100'; break
        default: break
      }
      if (!endpoint) return
      const { data: res } = await fetchWithAuth(endpoint)
      if (res.success) setData(res.data || [])
      else setError(res.message || 'Failed to load data')
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { loadData() }, [loadData])

  const handleKycReview = async (profileId, status) => {
    setKycActionLoading(profileId)
    try {
      const { data: res } = await fetchWithAuth(`/admin/kyc/${profileId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      if (res.success) {
        setData(prev => prev.filter(u => u.id !== profileId))
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setKycActionLoading(null)
    }
  }

  const handleToggleUserStatus = async (userId, activate) => {
    setUserActionLoading(userId)
    try {
      const { data: res } = await fetchWithAuth(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: activate ? 'true' : 'false' })
      })
      if (res.success) {
        setData(prev => prev.map(u => u.id === userId ? { ...u, isActive: activate } : u))
      }
    } catch (err) {
      alert(err.message || 'Failed to update user status')
    } finally {
      setUserActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    setUserActionLoading(userId)
    try {
      const { data: res } = await fetchWithAuth(`/admin/users/${userId}`, {
        method: 'DELETE'
      })
      if (res.success) {
        setData(prev => prev.filter(u => u.id !== userId))
        setDeleteConfirm(null)
      }
    } catch (err) {
      alert(err.message || 'Failed to delete user')
    } finally {
      setUserActionLoading(null)
    }
  }

  const filteredData = data.filter(item => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (item.firstName || '').toLowerCase().includes(q)
      || (item.lastName || '').toLowerCase().includes(q)
      || (item.email || '').toLowerCase().includes(q)
      || (item.customerName || '').toLowerCase().includes(q)
      || (item.partnerName || '').toLowerCase().includes(q)
      || (item.categoryName || '').toLowerCase().includes(q)
      || String(item.id || '').includes(q)
  })

  return (
    <div className="admin-mgmt">
      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSearch('') }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList count={4} lines={2} />
      ) : error ? (
        <div className="empty-state">
          <h4>Error loading data</h4>
          <p>{error}</p>
          <button className="btn btn-outline btn-sm" onClick={loadData}>Try Again</button>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="empty-state">
          <h4>No {activeTab} found</h4>
          <p>{search ? 'Try a different search term.' : 'No records to display.'}</p>
        </div>
      ) : activeTab === 'audit' ? (
        <div className="admin-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>Actor</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((log, i) => (
                <tr key={log.id || i}>
                  <td><span className="admin-action-badge">{log.action}</span></td>
                  <td>{log.entityType} #{log.entityId}</td>
                  <td className="text-secondary" style={{ maxWidth: '250px' }}>{log.description}</td>
                  <td>{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}</td>
                  <td className="text-muted">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {activeTab === 'customers' && (
                  <>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Action</th>
                  </>
                )}
                {activeTab === 'partners' && (
                  <>
                    <th>Name</th><th>Email</th><th>Skills</th><th>KYC</th><th>Online</th><th>Rating</th><th>Action</th>
                  </>
                )}
                {activeTab === 'bookings' && (
                  <>
                    <th>ID</th><th>Customer</th><th>Partner</th><th>Service</th><th>Status</th><th>Amount</th><th>Date</th><th>Action</th>
                  </>
                )}
                {activeTab === 'kyc' && (
                  <>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Submitted</th><th>Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, i) => (
                <tr key={item.id || i}>
                  {activeTab === 'customers' && (
                    <>
                      <td className="font-semibold">{item.firstName} {item.lastName}</td>
                      <td className="text-secondary">{item.email}</td>
                      <td>{item.phone}</td>
                      <td><span className={`status-badge status-${item.isActive !== false ? 'accepted' : 'cancelled'}`}>Customer</span></td>
                      <td className="text-muted">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className={`btn ${item.isActive !== false ? 'btn-danger' : 'btn-success'} btn-sm`}
                            onClick={() => handleToggleUserStatus(item.id, item.isActive === false)}
                            disabled={userActionLoading === item.id}
                          >
                            {item.isActive !== false ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteConfirm({ id: item.id, name: `${item.firstName} ${item.lastName}` })}
                            disabled={userActionLoading === item.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  {activeTab === 'partners' && (
                    <>
                      <td className="font-semibold">{item.firstName} {item.lastName}</td>
                      <td className="text-secondary">{item.email}</td>
                      <td className="text-secondary">{item.kycStatus || '—'}</td>
                      <td>
                        <span className={`status-badge status-${item.kycStatus === 'APPROVED' ? 'completed' : item.kycStatus === 'REJECTED' ? 'cancelled' : 'pending'}`}>
                          {item.kycStatus || 'N/A'}
                        </span>
                      </td>
                      <td>{item.isOnline ? <span className="dot dot-green" /> : <span className="dot dot-gray" />}</td>
                      <td className="text-secondary">{item.averageRating != null ? Number(item.averageRating).toFixed(1) : '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className={`btn ${item.isActive !== false ? 'btn-danger' : 'btn-success'} btn-sm`}
                            onClick={() => handleToggleUserStatus(item.id, item.isActive === false)}
                            disabled={userActionLoading === item.id}
                          >
                            {item.isActive !== false ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteConfirm({ id: item.id, name: `${item.firstName} ${item.lastName}` })}
                            disabled={userActionLoading === item.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  {activeTab === 'bookings' && (
                    <>
                      <td className="font-semibold">#{item.id}</td>
                      <td>{item.customerName}</td>
                      <td>{item.partnerName}</td>
                      <td>{item.categoryName}</td>
                      <td><span className={`status-badge status-${item.status === 'IN_PROGRESS' ? 'in_progress' : item.status.toLowerCase()}`}>{item.status}</span></td>
                      <td className="text-secondary">{item.totalAmount != null ? `₹${Number(item.totalAmount).toFixed(2)}` : '—'}</td>
                      <td className="text-muted">{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : '—'}</td>
                      <td>
                        {item.status === 'IN_PROGRESS' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setTrackingBookingId(item.id)}
                          >
                            Track
                          </button>
                        )}
                      </td>
                    </>
                  )}
                  {activeTab === 'kyc' && (
                    <>
                      <td className="font-semibold">{item.firstName} {item.lastName}</td>
                      <td className="text-secondary">{item.email}</td>
                      <td>{item.phone}</td>
                      <td className="text-muted">Pending review</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleKycReview(item.id, 'APPROVED')}
                            disabled={kycActionLoading === item.id}
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleKycReview(item.id, 'REJECTED')}
                            disabled={kycActionLoading === item.id}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live Tracking Modal */}
      {trackingBookingId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 m-0">Live Tracking (Booking #{trackingBookingId})</h3>
              <button
                onClick={() => setTrackingBookingId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
              >
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 min-h-[500px] relative">
              <LiveTrackingMap bookingId={trackingBookingId} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 m-0">Delete User</h3>
                <p className="text-sm text-gray-500 m-0">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will permanently remove their account and all associated data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirm(null)}
                disabled={userActionLoading === deleteConfirm.id}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDeleteUser(deleteConfirm.id)}
                disabled={userActionLoading === deleteConfirm.id}
              >
                {userActionLoading === deleteConfirm.id ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
