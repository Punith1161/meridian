import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email, password);
      setSuccess('Sign in successful!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .login-card {
          animation: slideUp 0.4s ease-out;
        }
        input:focus {
          box-shadow: inset 0 0 0 2px var(--accent-subtle);
        }
      `}</style>
      <div className="login-card bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-8 w-full max-w-sm shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--accent)] mb-2">MERIDIAN</h1>
          <p className="text-sm text-[var(--text-secondary)]">Personal productivity suite</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors ${
              emailFocused ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
            }`}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="you@example.com"
              className="input-base"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors ${
              passwordFocused ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
            }`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Enter your password"
              className="input-base"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="animate-pulse bg-[var(--danger-subtle)] border-2 border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>⚠</span>
              {error}
            </div>
          )}

          {success && (
            <div className="animate-pulse bg-[var(--success-subtle)] border-2 border-[var(--success)] text-[var(--success)] px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>✓</span>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 font-semibold text-base"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          Demo account • No registration required
        </div>
      </div>
    </div>
  );
}
