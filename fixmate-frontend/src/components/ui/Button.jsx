import React from 'react'

/**
 * Button — thin wrapper over the design-system `.btn` classes.
 * variant: primary | accent | gradient | outline | secondary | ghost | danger | success
 * size:    sm | md | lg
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon = null,
  className = '',
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      className={`btn btn-${variant} ${size !== 'md' ? `btn-${size}` : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner spinner-light" /> : icon}
      {children}
    </button>
  )
}
