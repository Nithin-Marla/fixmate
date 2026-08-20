import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench, ShieldCheck, MapPin, Star, Zap } from 'lucide-react'
import { fetchWithAuth } from '../api'
import Dropdown from '../components/Dropdown'
import './Auth.css'

// ── Country data ──────────────────────────────────────────────────────────────
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

// ── Validators ────────────────────────────────────────────────────────────────
function validateEmail(email) {
  if (!email.trim()) return 'Email is required.'
  // Strict regex: chars, then @gmail.com — nothing else
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.'
  }
  if (!email.toLowerCase().endsWith('@gmail.com')) {
    return 'Please enter a valid Gmail address (example@gmail.com).'
  }
  return ''
}

function validatePassword(password) {
  if (!password) return 'Password is required.'
  const problems = []
  if (password.length < 8) problems.push('at least 8 characters')
  if (!/[A-Z]/.test(password)) problems.push('at least one uppercase letter (A-Z)')
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('at least one special character')
  if (problems.length === 0) return ''
  return `Password must contain ${problems.join(', ')}.`
}

function validatePhone(phone, country) {
  if (!phone) return 'Mobile number is required.'
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly !== phone.replace(/[\s\-]/g, '')) {
    return 'Please enter only digits.'
  }
  if (digitsOnly.length !== country.phoneLen) {
    return `Please enter a valid ${country.phoneLen}-digit mobile number.`
  }
  return ''
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'ROLE_CUSTOMER',
  })
  const [countryCode, setCountryCode] = useState('IN')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0],
    [countryCode],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    // For phone, strip non-digits on change
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, country.phoneLen)
      setFormData((prev) => ({ ...prev, phone: digits }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
    // Clear the field error as the user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleCountryChange = (code) => {
    setCountryCode(code)
    // Reset phone when country changes so the length rules stay consistent
    setFormData((prev) => ({ ...prev, phone: '' }))
    setErrors((prev) => ({ ...prev, phone: '' }))
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    // Validate on blur
    const fieldErrors = {}
    if (field === 'email')  fieldErrors.email  = validateEmail(formData.email)
    if (field === 'password') fieldErrors.password = validatePassword(formData.password)
    if (field === 'phone')  fieldErrors.phone  = validatePhone(formData.phone, country)
    setErrors((prev) => ({ ...prev, ...fieldErrors }))
  }

  // ── Full validation ───────────────────────────────────────────────────────
  const validateAll = () => {
    const e = {}
    e.firstName = formData.firstName.trim() ? '' : 'First name is required.'
    e.lastName  = formData.lastName.trim()  ? '' : 'Last name is required.'
    e.email     = validateEmail(formData.email)
    e.password  = validatePassword(formData.password)
    e.phone     = validatePhone(formData.phone, country)
    setErrors(e)
    setTouched({ firstName: true, lastName: true, email: true, password: true, phone: true })
    return Object.values(e).every((v) => !v)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateAll()) return

    setLoading(true)
    try {
      // Build the phone with country code prefix (e.g. "+919440274562")
      const fullPhone = `${country.dial}${formData.phone}`

      const { data } = await fetchWithAuth('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...formData, phone: fullPhone }),
      })

      if (!data.success) {
        setError(data.message || 'Registration failed')
        return
      }

      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const FieldError = ({ field }) =>
    touched[field] && errors[field] ? (
      <span className="form-error">{errors[field]}</span>
    ) : null

  // Password checklist
  const pw = formData.password
  const pwChecks = [
    { label: 'At least 8 characters',           ok: pw.length >= 8 },
    { label: 'At least one uppercase letter',   ok: /[A-Z]/.test(pw) },
    { label: 'At least one special character',  ok: /[^A-Za-z0-9]/.test(pw) },
  ]

  return (
    <div className="auth-page">
      <div className="auth-shell">
        {/* ── Brand panel ─────────────────────────────────────────── */}
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
              <span className="dot dot-green" /> Verified local professionals
            </div>
          </div>
        </div>

        {/* ── Form panel ──────────────────────────────────────────── */}
        <div className="auth-form-panel">
          <div className="auth-container auth-container-wide">
            <div className="auth-header">
              <h2>Create an Account</h2>
              <p>Join FixMate to start booking or providing services</p>
            </div>

            {error   && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">Registration successful! Redirecting to login...</div>}

            <form onSubmit={handleRegister} className="auth-form" noValidate>
              {/* Name row */}
              <div className="form-row">
                <div className="form-group half-width">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className="form-input"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={() => handleBlur('firstName')}
                  />
                  <FieldError field="firstName" />
                </div>
                <div className="form-group half-width">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className="form-input"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={() => handleBlur('lastName')}
                  />
                  <FieldError field="lastName" />
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="text"
                  name="email"
                  className="form-input"
                  placeholder="example@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  autoComplete="email"
                />
                <FieldError field="email" />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                  autoComplete="new-password"
                />
                <FieldError field="password" />

                {/* Live checklist */}
                <ul className="pw-checklist">
                  {pwChecks.map((c) => (
                    <li key={c.label} className={c.ok ? 'pw-check-ok' : ''}>
                      <span className="pw-check-icon">{c.ok ? '✓' : '○'}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Phone: country selector + number */}
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="phone-row">
                  <div className="phone-country">
                    <Dropdown
                      value={countryCode}
                      onChange={handleCountryChange}
                      options={countryOptions}
                      placeholder="Country"
                    />
                  </div>
                  <div className="phone-number">
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      placeholder={`${country.phoneLen} digits`}
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={() => handleBlur('phone')}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={country.phoneLen}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                <FieldError field="phone" />
              </div>

              {/* Role */}
              <div className="form-group">
                <label className="form-label">I want to...</label>
                <Dropdown
                  value={formData.role}
                  onChange={(value) => handleChange({ target: { name: 'role', value } })}
                  placeholder="Select a role..."
                  options={[
                    { value: 'ROLE_CUSTOMER', label: 'Hire a Service Professional (Customer)' },
                    { value: 'ROLE_SERVICE_PARTNER', label: 'Provide Services (Service Partner)' },
                  ]}
                />
              </div>

              <button type="submit" className="btn btn-gradient btn-lg auth-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner spinner-light" /> Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign in instead</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
