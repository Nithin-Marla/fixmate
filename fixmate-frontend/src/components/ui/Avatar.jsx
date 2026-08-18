import React from 'react'

export default function Avatar({ name = '?', size = 'md' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className={`avatar avatar-${size}`} aria-hidden="true">
      {initial}
    </div>
  );
}
