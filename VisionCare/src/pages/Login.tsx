import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple validation - in production, use real authentication
    if (email && password) {
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-glow auth-glow-1"></div>
        <div className="auth-glow auth-glow-2"></div>
        <div className="auth-glow auth-glow-3"></div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span className="logo-icon">👁️</span>
              <span className="logo-text">VisionCare</span>
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to access your eye health dashboard</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="auth-button">
              Sign In
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <button onClick={() => navigate('/signup')} className="link-button">
                Sign up
              </button>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <h3>Real-time Monitoring</h3>
            <p>Track your eye health with AI-powered analysis</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>Your data stays on your device, always encrypted</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h3>Detailed Insights</h3>
            <p>Get comprehensive reports on blinks, emotions & redness</p>
          </div>
        </div>
      </div>
    </div>
  );
}
