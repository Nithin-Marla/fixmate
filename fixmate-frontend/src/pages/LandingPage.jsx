import React from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Zap, Search, CalendarCheck, ShieldCheck, Star } from 'lucide-react'
import './LandingPage.css'

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-container nav-content">
          <div className="logo-section">
            <div className="logo-icon-wrap">
              <Wrench className="logo-icon" size={24} />
            </div>
            <span className="logo-text">FixMate</span>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-outline">Log in</Link>
            <Link to="/register" className="btn btn-primary shadow-hover">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="landing-container hero-content">
          <div className="hero-badge">
            <Zap size={14} className="badge-icon" />
            <span>Fast, Reliable Home Services</span>
          </div>
          <h1 className="hero-title">
            Your Home Needs, <br/>
            <span className="gradient-text">Expertly Fixed.</span>
          </h1>
          <p className="hero-subtitle">
            Connect with top-rated professionals for plumbing, electrical, cleaning, and more. 
            Book instantly and track your service partner in real-time.
          </p>
          <div className="hero-cta-group">
            <Link to="/register" className="btn btn-primary btn-lg shadow-hover">Get Started Now</Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Partner With Us</Link>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </section>

      {/* How it Works Section */}
      <section className="features-section">
        <div className="landing-container">
          <div className="section-header">
            <h2>How FixMate Works</h2>
            <p>Get your problems solved in three simple steps</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box bg-blue">
                <Search size={28} />
              </div>
              <h3>1. Find a Service</h3>
              <p>Browse our categories and pick the service you need, from quick repairs to deep cleaning.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box bg-purple">
                <CalendarCheck size={28} />
              </div>
              <h3>2. Book & Track</h3>
              <p>Schedule a time that works for you. Track your partner's location live on the map as they arrive.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box bg-green">
                <ShieldCheck size={28} />
              </div>
              <h3>3. Get it Fixed</h3>
              <p>Sit back while our verified professionals complete the job. Secure payments and guaranteed quality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-content">
          <div className="footer-brand">
            <div className="logo-icon-wrap mb-3">
              <Wrench className="logo-icon" size={24} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--neutral-900)' }}>FixMate</h4>
            <p style={{ marginTop: '0.5rem' }}>Premium home services at your fingertips.</p>
          </div>
          <div className="footer-links">
            <p>&copy; {new Date().getFullYear()} FixMate. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
