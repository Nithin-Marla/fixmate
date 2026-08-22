import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Clock, CheckCircle2, Truck, MapPin, Wrench, CreditCard,
  MessageSquare, Star, Calendar, AlertTriangle, RotateCcw, Download
} from 'lucide-react'
import { fetchWithAuth } from '../api'
import { RatingStars, StarSelector } from './ui/RatingStars'
import ServiceIcon from './ui/ServiceIcon'
import './BookingTracking.css'

const STATUS_PIPELINE = [
  { key: 'PENDING', label: 'Request Sent', icon: Clock, color: 'var(--warning)' },
  { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2, color: 'var(--primary)' },
  { key: 'ON_WAY', label: 'On The Way', icon: Truck, color: 'var(--info)' },
  { key: 'ARRIVED', label: 'Arrived', icon: MapPin, color: 'var(--info-dark)' },
  { key: 'IN_PROGRESS', label: 'Service In Progress', icon: Wrench, color: 'var(--accent)' },
  { key: 'COMPLETED', label: 'Service Completed', icon: CheckCircle2, color: 'var(--success)' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending', icon: CreditCard, color: 'var(--warning)' },
  { key: 'CANCELLED', label: 'Cancelled', icon: X, color: 'var(--danger)' }
]

const CANCEL_REASONS = [
  'Changed my mind',
  'Found another professional',
  'Professional delayed too long',
  'Wrong service type',
  'No longer needed',
  'Other'
]

function getTimelineIndex(status) {
  const idx = STATUS_PIPELINE.findIndex(s => s.key === status)
  return idx === -1 ? 0 : idx
}

export default function BookingTracking({ booking, onClose, isPartner, onStatusUpdate }) {
  const [loading, setLoading] = useState(false)
  const [payment, setPayment] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [showPayModal, setShowPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState('CASH')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const statusIdx = getTimelineIndex(booking.status)
  const isCancelled = booking.status === 'CANCELLED'
  const isCompleted = booking.status === 'COMPLETED'
  const isPaid = booking.paymentStatus === 'SUCCESS'

  useEffect(() => {
    if (booking.status === 'COMPLETED' || booking.status === 'PAYMENT_PENDING') {
      loadPayment()
    }
  }, [booking.id, booking.status])

  const loadPayment = async () => {
    try {
      const { data } = await fetchWithAuth(`/bookings/${booking.id}/payment`)
      if (data.success) setPayment(data.data)
    } catch { /* no payment yet */ }
  }

  const handleStatusUpdate = async (status) => {
    setActionLoading(true)
    setMsg(null)
    try {
      const { data } = await fetchWithAuth(`/bookings/${booking.id}/status?status=${status}`, { method: 'PATCH' })
      if (data.success) {
        setMsg({ type: 'success', text: `Status updated to ${status}` })
        onStatusUpdate?.(data.data)
        setTimeout(() => setMsg(null), 2000)
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    setMsg(null)
    const reason = cancelReason === 'Other' ? customReason : cancelReason
    try {
      const { data } = await fetchWithAuth(`/bookings/${booking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      })
      if (data.success) {
        setShowCancelModal(false)
        setMsg({ type: 'success', text: 'Booking cancelled.' })
        onStatusUpdate?.(data.data)
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!newDate) return
    setActionLoading(true)
    setMsg(null)
    try {
      const { data } = await fetchWithAuth(`/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ newScheduledDate: newDate })
      })
      if (data.success) {
        setShowRescheduleModal(false)
        setMsg({ type: 'success', text: 'Booking rescheduled.' })
        onStatusUpdate?.(data.data)
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePayment = async () => {
    setActionLoading(true)
    try {
      const { data } = await fetchWithAuth(`/bookings/${booking.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id, method: payMethod })
      })
      if (data.success) {
        setShowPayModal(false)
        setPayment(data.data)
        setMsg({ type: 'success', text: 'Payment processed successfully!' })
        onStatusUpdate?.({ ...booking, paymentStatus: 'SUCCESS' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setSavingReview(true)
    try {
      const { data } = await fetchWithAuth(`/reviews/booking/${booking.id}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: reviewComment })
      })
      if (data.success) {
        setShowReviewModal(false)
        setMsg({ type: 'success', text: 'Review submitted!' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSavingReview(false)
    }
  }

  // Determine available actions based on role and status
  const getPartnerActions = () => {
    if (isCancelled || isCompleted) return []
    const actions = []
    if (booking.status === 'PENDING') {
      actions.push({ label: 'Accept', status: 'ACCEPTED', className: 'btn-primary' })
    }
    if (booking.status === 'ACCEPTED') {
      actions.push({ label: 'On My Way', status: 'ON_WAY', className: 'btn-info' })
      actions.push({ label: 'Mark Arrived', status: 'ARRIVED', className: 'btn-accent' })
    }
    if (booking.status === 'ON_WAY') {
      actions.push({ label: 'Arrived', status: 'ARRIVED', className: 'btn-accent' })
    }
    if (booking.status === 'ARRIVED' || booking.status === 'ACCEPTED') {
      actions.push({ label: 'Start Service', status: 'IN_PROGRESS', className: 'btn-primary' })
    }
    if (booking.status === 'IN_PROGRESS') {
      actions.push({ label: 'Complete Service', status: 'COMPLETED', className: 'btn-success' })
    }
    return actions
  }

  const getCustomerActions = () => {
    if (isCancelled || isCompleted || isPaid) return []
    if (booking.status === 'COMPLETED' && !isPaid) {
      return [{ label: 'Pay Now', action: () => setShowPayModal(true), className: 'btn-primary' }]
    }
    return []
  }

  const portalContent = (
    <div className="booking-tracking-overlay" onClick={onClose}>
      <div className="booking-tracking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bt-header">
          <div className="bt-header-info">
            <div className="bt-booking-id">
              <ServiceIcon categoryName={booking.categoryName} size={18} />
              <span>#{booking.id}</span>
              {booking.emergency && <span className="status-badge status-emergency">EMERGENCY</span>}
            </div>
            <h3 className="bt-category">{booking.categoryName || 'Service'}</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Status Message */}
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {msg.text}
          </div>
        )}

        {/* Status Timeline */}
        {!isCancelled ? (
          <div className="bt-timeline">
            {STATUS_PIPELINE.filter(s => s.key !== 'CANCELLED' && s.key !== 'PAYMENT_PENDING').map((step, i) => {
              const Icon = step.icon
              const done = i < statusIdx
              const active = i === statusIdx
              return (
                <div key={step.key} className={`bt-timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                  <div className="bt-step-dot" style={{ borderColor: done || active ? step.color : '', background: done ? step.color : '' }}>
                    {done ? <CheckCircle2 size={14} /> : <Icon size={14} style={{ color: active ? step.color : 'var(--text-muted)' }} />}
                  </div>
                  <div className="bt-step-info">
                    <span className="bt-step-label">{step.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bt-cancelled-banner">
            <AlertTriangle size={18} />
            <div>
              <strong>Booking Cancelled</strong>
              {booking.cancellationReason && <p>Reason: {booking.cancellationReason}</p>}
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="bt-details">
          <div className="bt-detail-row">
            <span className="bt-detail-label">Partner</span>
            <span className="bt-detail-value">{booking.partnerName}</span>
          </div>
          <div className="bt-detail-row">
            <span className="bt-detail-label">Customer</span>
            <span className="bt-detail-value">{booking.customerName}</span>
          </div>
          <div className="bt-detail-row">
            <span className="bt-detail-label">Scheduled</span>
            <span className="bt-detail-value">
              <Calendar size={14} />
              {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleString() : '—'}
            </span>
          </div>
          <div className="bt-detail-row">
            <span className="bt-detail-label">Location</span>
            <span className="bt-detail-value">{booking.addressDetails}</span>
          </div>
          {booking.totalAmount != null && (
            <div className="bt-detail-row">
              <span className="bt-detail-label">Amount</span>
              <span className="bt-detail-value bt-amount">₹{Number(booking.totalAmount).toFixed(2)}</span>
            </div>
          )}
          {booking.notes && (
            <div className="bt-detail-row">
              <span className="bt-detail-label">Notes</span>
              <span className="bt-detail-value bt-notes">{booking.notes}</span>
            </div>
          )}
        </div>

        {/* Payment Section */}
        {payment && (
          <div className="bt-payment-section">
            <h4><CreditCard size={16} /> Payment</h4>
            <div className="bt-payment-grid">
              <div className="bt-payment-row">
                <span>Service Charge</span><span>₹{Number(payment.serviceAmount).toFixed(2)}</span>
              </div>
              <div className="bt-payment-row">
                <span>Platform Fee</span><span>₹{Number(payment.platformFee).toFixed(2)}</span>
              </div>
              {payment.discountAmount > 0 && (
                <div className="bt-payment-row bt-discount">
                  <span>Discount</span><span>-₹{Number(payment.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="bt-payment-row bt-total">
                <span>Total</span><span>₹{Number(payment.totalAmount).toFixed(2)}</span>
              </div>
              <div className="bt-payment-row">
                <span>Status</span>
                <span className={`status-badge status-${payment.status === 'SUCCESS' ? 'completed' : 'pending'}`}>
                  {payment.status}
                </span>
              </div>
              <div className="bt-payment-row">
                <span>Method</span><span>{payment.method}</span>
              </div>
              {payment.invoiceNumber && (
                <div className="bt-payment-row">
                  <span>Invoice</span>
                  <span className="bt-invoice-num">{payment.invoiceNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bt-actions">
          {/* Partner actions */}
          {isPartner && getPartnerActions().map((action) => (
            <button
              key={action.status}
              className={`btn ${action.className}`}
              onClick={() => handleStatusUpdate(action.status)}
              disabled={actionLoading}
            >
              {action.label}
            </button>
          ))}

          {/* Customer actions */}
          {!isPartner && !isCompleted && !isCancelled && (
            <>
              {booking.status !== 'PENDING' && (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowRescheduleModal(true)}
                  disabled={actionLoading}
                >
                  <RotateCcw size={14} /> Reschedule
                </button>
              )}
              <button
                className="btn btn-danger-outline"
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
              >
                <X size={14} /> Cancel
              </button>
            </>
          )}

          {/* Pay button for customer when completed */}
          {!isPartner && booking.status === 'COMPLETED' && !isPaid && (
            <button
              className="btn btn-primary"
              onClick={() => setShowPayModal(true)}
            >
              <CreditCard size={14} /> Pay Now
            </button>
          )}

          {/* Review button */}
          {!isPartner && isCompleted && (
            <button
              className="btn btn-accent"
              onClick={() => setShowReviewModal(true)}
            >
              <Star size={14} /> Leave Review
            </button>
          )}

          {/* Download Invoice */}
          {isPaid && payment?.invoiceNumber && (
            <button className="btn btn-secondary">
              <Download size={14} /> Invoice
            </button>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="bt-submodal">
            <div className="bt-submodal-content">
              <h4>Cancel Booking</h4>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Please select a reason for cancellation:
              </p>
              <div className="bt-reasons">
                {CANCEL_REASONS.map((r) => (
                  <label key={r} className={`bt-reason-option ${cancelReason === r ? 'selected' : ''}`}>
                    <input type="radio" name="cancelReason" value={r}
                      onChange={() => setCancelReason(r)} checked={cancelReason === r} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              {cancelReason === 'Other' && (
                <textarea
                  className="form-input"
                  placeholder="Please describe..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={2}
                  style={{ marginTop: '0.75rem' }}
                />
              )}
              <div className="bt-submodal-actions">
                <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Back</button>
                <button
                  className="btn btn-danger"
                  onClick={handleCancel}
                  disabled={actionLoading || !cancelReason || (cancelReason === 'Other' && !customReason.trim())}
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="bt-submodal">
            <div className="bt-submodal-content">
              <h4>Reschedule Booking</h4>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">New Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="bt-submodal-actions">
                <button className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)}>Back</button>
                <button
                  className="btn btn-primary"
                  onClick={handleReschedule}
                  disabled={actionLoading || !newDate}
                >
                  {actionLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayModal && (
          <div className="bt-submodal">
            <div className="bt-submodal-content">
              <h4>Complete Payment</h4>
              <div className="bt-payment-grid" style={{ margin: '1rem 0' }}>
                {booking.totalAmount != null && (
                  <div className="bt-payment-row bt-total">
                    <span>Amount to Pay</span><span>₹{Number(booking.totalAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <label className="form-label">Payment Method</label>
              <div className="bt-payment-methods">
                {['CASH', 'UPI', 'CARD', 'WALLET'].map((m) => (
                  <button
                    key={m}
                    className={`btn ${payMethod === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setPayMethod(m)}
                  >
                    {m === 'CASH' ? '💵 Cash' : m === 'UPI' ? '📱 UPI' : m === 'CARD' ? '💳 Card' : '👛 Wallet'}
                  </button>
                ))}
              </div>
              <div className="bt-submodal-actions">
                <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Back</button>
                <button className="btn btn-primary" onClick={handlePayment} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : `Pay ₹${booking.totalAmount != null ? Number(booking.totalAmount).toFixed(2) : '299.00'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="bt-submodal">
            <div className="bt-submodal-content">
              <h4>Rate Your Experience</h4>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                How was the service from {booking.partnerName}?
              </p>
              <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                <StarSelector value={rating} onChange={setRating} />
              </div>
              <textarea
                className="form-input"
                placeholder="Write your review (optional)..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
              <div className="bt-submodal-actions">
                <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>Back</button>
                <button className="btn btn-primary" onClick={handleSubmitReview} disabled={savingReview}>
                  {savingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(portalContent, document.body)
}
