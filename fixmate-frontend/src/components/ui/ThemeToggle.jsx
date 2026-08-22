import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

const THEME_KEY = 'fixmate_theme'

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light'
  } catch {
    return 'light'
  }
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => getStoredTheme())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <button
      className={`topbar-icon-btn ${className}`}
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ border: 'none', background: 'var(--surface-hover)' }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
