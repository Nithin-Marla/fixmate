import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench, ShieldCheck, MapPin, Star, Zap } from 'lucide-react'
import { fetchWithAuth } from '../api'
import Dropdown from '../components/Dropdown'
import './Auth.css'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'ROLE_CUSTOMER'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await fetchWithAuth('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (!data.success) {
        setError(data.message || 'Registration failed');
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <span className="dot dot-green" /> Verified local professionals
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-container auth-container-wide">
            <div className="auth-header">
              <h2>Create an Account</h2>
              <p>Join FixMate to start booking or providing services</p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">Registration successful! Redirecting to login...</div>}

            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-row">
                <div className="form-group half-width">
                  <label className="form-label">First Name</label>
                  <input type="text" name="firstName" className="form-input" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="form-group half-width">
                  <label className="form-label">Last Name</label>
                  <input type="text" name="lastName" className="form-input" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" name="password" className="form-input" value={formData.password} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">I want to...</label>
                <Dropdown
                  value={formData.role}
                  onChange={(value) => handleChange({ target: { name: 'role', value } })}
                  placeholder="Select a role..."
                  options={[
                    { value: 'ROLE_CUSTOMER', label: 'Hire a Service Professional (Customer)' },
                    { value: 'ROLE_SERVICE_PARTNER', label: 'Provide Services (Service Partner)' }
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
