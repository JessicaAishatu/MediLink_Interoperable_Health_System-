import React, { useState } from 'react';
import { Activity, ShieldAlert, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Register({ onNavigateToLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'Female',
    phone: '',
    address: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'patient'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setSuccess(true);
      setTimeout(() => {
        onNavigateToLogin();
      }, 2000);

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
        <h1>Patient Registration</h1>
        <p>Creating your digital health passport. Once registered, your health data will be structured in standard HL7 FHIR formats, allowing interoperable syncing across hospital nodes.</p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card" style={{ maxWidth: '500px' }}>
          <div className="auth-form-header">
            <h2>Register Profile</h2>
            <p>Enter your details to create an interoperable EHR record</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} />
              <span>Registration successful! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName-input">First Name</label>
                <input
                  id="firstName-input"
                  type="text"
                  name="firstName"
                  className="form-control"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lastName-input">Last Name</label>
                <input
                  id="lastName-input"
                  type="text"
                  name="lastName"
                  className="form-control"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email-input">Email Address</label>
              <input
                id="reg-email-input"
                type="email"
                name="email"
                className="form-control"
                placeholder="john.doe@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password-input">Password</label>
              <input
                id="reg-password-input"
                type="password"
                name="password"
                className="form-control"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="birthDate-input">Birth Date</label>
                <input
                  id="birthDate-input"
                  type="date"
                  name="birthDate"
                  className="form-control"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gender-select">Gender</label>
                <select
                  id="gender-select"
                  name="gender"
                  className="form-control"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone-input">Phone Number</label>
              <input
                id="reg-phone-input"
                type="tel"
                name="phone"
                className="form-control"
                placeholder="+1-555-0199"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label" htmlFor="address-input">Home Address</label>
              <input
                id="address-input"
                type="text"
                name="address"
                className="form-control"
                placeholder="123 Main St, Springfield"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginBottom: '20px' }}
              disabled={loading || success}
            >
              {loading ? 'Submitting Details...' : 'Create Account'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px' }}
              onClick={onNavigateToLogin}
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
