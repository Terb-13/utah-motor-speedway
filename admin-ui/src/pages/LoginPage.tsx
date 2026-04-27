import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { ready, authenticated, login } = useAuth();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/';

  if (ready && authenticated) {
    return <Navigate to={from === '/login' ? '/' : from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(197, 162, 111, 0.14), transparent), var(--wf-bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '2rem 2rem 2.25rem',
          borderRadius: 12,
          border: '1px solid var(--wf-border)',
          background: 'var(--wf-surface)',
          boxShadow: '0 40px 80px -40px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'var(--wf-gold)',
              marginBottom: 8,
            }}
          >
            Wildfire Raceway
          </div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: 'var(--wf-heading)' }}>
            Admin access
          </h1>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: 'var(--wf-text-dim)', fontWeight: 300 }}>
            Enter the dashboard password to continue.
          </p>
        </div>
        <form onSubmit={onSubmit}>
          <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--wf-text-dim)', marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 10,
              border: '1px solid var(--wf-border)',
              background: 'var(--wf-bg)',
              color: 'var(--wf-heading)',
              fontSize: '1rem',
              marginBottom: '1rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            placeholder="••••••••"
          />
          {error ? (
            <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0 0 1rem' }}>{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !password}
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(180deg, #d4b487, var(--wf-gold))',
              color: '#0a0a0a',
              fontWeight: 600,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: busy || !password ? 'not-allowed' : 'pointer',
              opacity: busy || !password ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
