import React from 'react'
import { SearchX, AlertTriangle, RefreshCw } from 'lucide-react'

export function EmptyState({ icon = null, title, message, action = null }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <SearchX size={22} />}</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
        <AlertTriangle size={22} />
      </div>
      <h4>Something went wrong</h4>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
