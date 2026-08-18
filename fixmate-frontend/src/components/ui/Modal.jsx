import React, { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Reusable modal dialog.
 * Props: open, onClose, title, subtitle, size ('md' | 'lg' | 'sm'),
 *        footer (React node), children.
 */
export default function Modal({ open, onClose, title, subtitle, size = 'md', footer, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${size !== 'md' ? `modal-${size}` : ''}`} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="modal-header">
            <div>
              {title && <h3>{title}</h3>}
              {subtitle && <div className="modal-subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-actions" style={{ padding: '0 1.75rem 1.5rem', marginTop: 0 }}>{footer}</div>}
      </div>
    </div>
  )
}
