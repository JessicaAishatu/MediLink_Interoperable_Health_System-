import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import { Activity, ShieldAlert, LogOut, User } from 'lucide-react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'register', 'dashboard'
  const [initLoading, setInitLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setView('dashboard');
      } catch (err) {
        // Clear corrupt state
        localStorage.clear();
        setView('login');
      }
    }
    setInitLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setView('login');
  };

  if (initLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', fontFamily: 'var(--font-headings)' }}>
        <Activity className="logo-icon" size={48} />
        <h2>Initializing MediLink...</h2>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Header / Navbar */}
      <header className="app-header">
        <div className="nav-container">
          <div className="logo-section">
            <Activity size={26} className="logo-icon" />
            <span>MediLink System</span>
          </div>

          <div className="nav-menu">
            {view === 'dashboard' && user && (
              <>
                <div className="user-badge">
                  <User size={14} />
                  <span>{user.email} ({user.role})</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', gap: '6px' }}
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            )}
            {view === 'register' && (
              <button onClick={() => setView('login')} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                Sign In
              </button>
            )}
            {view === 'login' && (
              <button onClick={() => setView('register')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Pages Content */}
      <main style={{ flex: 1 }}>
        {view === 'login' && (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onNavigateToRegister={() => setView('register')} 
          />
        )}
        {view === 'register' && (
          <Register 
            onNavigateToLogin={() => setView('login')} 
          />
        )}
        {view === 'dashboard' && user && (
          <>
            {user.role === 'patient' ? (
              <PatientDashboard user={user} onLogout={handleLogout} />
            ) : (
              <DoctorDashboard user={user} onLogout={handleLogout} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
