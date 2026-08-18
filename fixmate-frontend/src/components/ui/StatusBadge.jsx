import React from 'react'

/**
 * StatusBadge — maps backend status strings to the design-system badge colors.
 * Pass `color` to force a class or `style` for an exact override.
 */
export default function StatusBadge({ status, children, style, dot }) {
  const cls = String(status || '').toLowerCase().replace(/ /g, '_');
  return (
    <span className={`status-badge ${cls ? `status-${cls}` : ''}`} style={style}>
      {dot && <span className={`dot dot-${dot}`} />}
      {children}
    </span>
  );
}
