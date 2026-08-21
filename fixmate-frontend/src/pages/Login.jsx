import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench, ShieldCheck, Zap, Star, MapPin, Mail, Phone } from 'lucide-react'
import { fetchWithAuth } from '../api'
import Dropdown from '../components/Dropdown'
import './Auth.css'

// ── Country data (same as Register) ───────────────────────────────────────────
const COUNTRIES = [
  { code: 'IN', name: 'India',           dial: '+91',  flag: '🇮🇳', phoneLen: 10 },
  { code: 'US', name: 'United States',   dial: '+1',   flag: '🇺🇸', phoneLen: 10 },
  { code: 'GB', name: 'United Kingdom',  dial: '+44',  flag: '🇬🇧', phoneLen: 10 },
  { code: 'AE', name: 'UAE',             dial: '+971', flag: '🇦🇪', phoneLen: 9 },
  { code: 'CA', name: 'Canada',          dial: '+1',   flag: '🇨🇦', phoneLen: 10 },
  { code: 'AU', name: 'Australia',       dial: '+61',  flag: '🇦🇺', phoneLen: 9 },
  { code: 'SG', name: 'Singapore',       dial: '+65',  flag: '🇸🇬', phoneLen: 8 },
  { code: 'DE', name: 'Germany',         dial: '+49',  flag: '🇩🇪', phoneLen: 11 },
  { code: 'FR', name: 'France',          dial: '+33',  flag: '🇫🇷', phoneLen: 9 },
  { code: 'JP', name: 'Japan',           dial: '+81',  flag: '🇯🇵', phoneLen: 10 },
]

const countryOptions = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name} (${c.dial})`,
}))

export default function Login() {
  const [mode, setMode] = useState('email') // 'email' | 'phone'
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('IN')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0],
    [countryCode],
  )

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, country.phoneLen)
    setPhone(digits)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Build the identifier: email or phone with country code
      const identifier = mode === 'email' ? email.trim() : `${country.dial}${phone}`

      const { data } = await fetchWithAuth('/auth/authenticate', {
        method: 'POST',
        // Send both 'email' and 'identifier' for backward compatibility 
        // with the production backend that hasn't been updated yet!
        body: JSON.stringify({ identifier, email: identifier, password }),
      })

      if (!data.success) {
        setError(data.message || 'Login failed')
        return
      }

      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data))

      if (data.data.role === 'ROLE_ADMIN') {
        navigate('/admin/dashboard')
      } else if (data.data.role === 'ROLE_SERVICE_PARTNER') {
        navigate('/partner/dashboard')
      } else {
        navigate('/customer/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Simple validation: block submit if fields are empty
  const canSubmit =
    password &&
    ((mode === 'email' && email.trim()) || (mode === 'phone' && phone.length === country.phoneLen))

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <Wrench size={26} />
            </div>
            <h1>FixMate</h1>
            <p className="auth-brand-tagline">
              Local professionals, verified & nearby — booked in minutes.
            </p>
            <ul className="auth-brand-features">
              <li><ShieldCheck size={18} /> KYC-verified service partners</li>
              <li><MapPin size={18} /> Live nearby matching by distance</li>
              <li><Zap size={18} /> Emergency help, instantly</li>
              <li><Star size={18} /> Real ratings from real bookings</li>
            </ul>
            <div className="auth-brand-footer">
              <span className="dot dot-green" /> 3 services · online now
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-container">
            <div className="auth-header">
              <h2>Welcome Back</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleLogin} className="auth-form" noValidate>
              {/* ── Email / Phone toggle tabs ─────────────────────── */}
              <div className="login-mode-tabs">
                <button
                  type="button"
                  className={`login-mode-tab ${mode === 'email' ? 'login-mode-tab-active' : ''}`}
                  onClick={() => { setMode('email'); setError('') }}
                >
                  <Mail size={15} /> Email
                </button>
                <button
                  type="button"
                  className={`login-mode-tab ${mode === 'phone' ? 'login-mode-tab-active' : ''}`}
                  onClick={() => { setMode('phone'); setError('') }}
                >
                  <Phone size={15} /> Phone
                </button>
              </div>

              {/* ── Email field ────────────────────────────────────── */}
              {mode === 'email' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              )}

              {/* ── Phone field ────────────────────────────────────── */}
              {mode === 'phone' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="login-phone">Phone Number</label>
                  <div className="phone-row">
                    <div className="phone-country">
                      <Dropdown
                        value={countryCode}
                        onChange={setCountryCode}
                        options={countryOptions}
                        placeholder="Country"
                      />
                    </div>
                    <div className="phone-number">
                      <input
                        id="login-phone"
                        type="tel"
                        className="form-input"
                        placeholder={`${country.phoneLen} digits`}
                        value={phone}
                        onChange={handlePhoneChange}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={country.phoneLen}
                        autoComplete="tel-national"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Password ───────────────────────────────────────── */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-gradient btn-lg auth-submit"
                disabled={loading || !canSubmit}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-light" /> Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account? <Link to="/register">Create one now</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
