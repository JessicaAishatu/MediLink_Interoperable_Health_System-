import React, { useState } from 'react';
import { Activity, ShieldAlert, Key, Mail, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      // Save to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-branding">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <Activity size={32} className="logo-icon" />
          <h2 style={{ color: 'white', fontFamily: 'var(--font-headings)' }}>MediLink</h2>
        </div>
        <h1>Interoperable Electronic Health Records</h1>
        <p>A secure medical platform designed with standard HL7 FHIR protocols, connecting hospital systems, doctors, and patients in real time.</p>
        
        <div className="branding-features">
          <div className="branding-item">
            <div className="branding-item-icon"><Activity size={20} /></div>
            <div className="branding-item-text">
              <h4>FHIR R4 Standardized</h4>
              <p>Clinical resources fully exported, matched, and synchronized with HL7 FHIR APIs.</p>
            </div>
          </div>
          <div className="branding-item">
            <div className="branding-item-icon"><Key size={20} /></div>
            <div className="branding-item-text">
              <h4>RBAC Security & JWT</h4>
              <p>Strict role-based access control protecting highly confidential clinical data.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2>Welcome Back</h2>
            <p>Access your health records and services securely</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  id="email-input"
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '48px' }}
                  placeholder="name@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label" htmlFor="password-input">Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  id="password-input"
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '48px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginBottom: '20px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight size={18} />}
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
              New patient?{' '}
              <span
                onClick={onNavigateToRegister}
                style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Register Here
              </span>
            </div>
          </form>
          
          {/* Quick Login Helper for Demo */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Demo accounts:</span>
            Patient: <code>alice@health.com</code> / <code>password123</code><br/>
            Doctor: <code>dr.doe@health.com</code> / <code>password123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
