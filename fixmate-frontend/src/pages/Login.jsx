import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench, ShieldCheck, Zap, Star, MapPin } from 'lucide-react'
import { fetchWithAuth } from '../api'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await fetchWithAuth('/auth/authenticate', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (!data.success) {
        setError(data.message || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data));

      if (data.data.role === 'ROLE_ADMIN') {
        navigate('/admin/dashboard');
      } else if (data.data.role === 'ROLE_SERVICE_PARTNER') {
        navigate('/partner/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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

            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-gradient btn-lg auth-submit" disabled={loading}>
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
