import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple validation - in production, use real authentication
    if (name && email && password && password === confirmPassword) {
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/dashboard');
    } else if (password !== confirmPassword) {
      alert('Passwords do not match!');
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
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Start monitoring your eye health today</p>
          </div>

          <form className="auth-form" onSubmit={handleSignup}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

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
                placeholder="Create a strong password"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>I agree to the Terms of Service and Privacy Policy</span>
              </label>
            </div>

            <button type="submit" className="auth-button">
              Create Account
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="link-button">
                Sign in
              </button>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <h3>Quick Setup</h3>
            <p>Get started in less than 60 seconds</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered</h3>
            <p>Advanced machine learning for accurate detection</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🌐</div>
            <h3>Works Everywhere</h3>
            <p>Access from any device with a camera</p>
          </div>
        </div>
      </div>
    </div>
  );
}
