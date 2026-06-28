import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { ready, authenticated, login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const autoLoginAttempted = useRef(false);

  const from = (location.state as { from?: string } | null)?.from || '/';

  // DEMO MODE: Auto-enter on load so the CEO lands directly in the command center.
  useEffect(() => {
    if (!ready || authenticated || autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;
    (async () => {
      setError('');
      setBusy(true);
      try {
        await login('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign in failed');
      } finally {
        setBusy(false);
      }
    })();
  }, [ready, authenticated, login]);

  if (ready && authenticated) {
    return <Navigate to={from === '/login' ? '/' : from} replace />;
  }

  // DEMO MODE: No password required. One-click entry for easy hands-on review.
  async function onDemoLogin() {
    setError('');
    setBusy(true);
    try {
      await login(''); // Password ignored in demo backend
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
          maxWidth: 420,
          padding: '2.5rem 2.5rem 2.75rem',
          borderRadius: 16,
          border: '1px solid var(--wf-border)',
          background: 'var(--wf-surface)',
          boxShadow: '0 40px 80px -40px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'var(--wf-gold)',
              marginBottom: 8,
            }}
          >
            Wildfire Raceway — DEMO
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 600, color: 'var(--wf-heading)' }}>
            Staff Command Center
          </h1>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.95rem', color: 'var(--wf-text-dim)', fontWeight: 300 }}>
            Full internal operating dashboard for the CEO demo.
          </p>
        </div>

        {error ? (
          <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0 0 1rem', textAlign: 'center' }}>{error}</p>
        ) : null}

        <button
          type="button"
          onClick={onDemoLogin}
          disabled={busy}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(180deg, #d4b487, var(--wf-gold))',
            color: '#0a0a0a',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(197, 162, 111, 0.3)',
          }}
        >
          {busy ? 'Entering Command Center…' : 'Enter Demo Command Center'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--wf-text-dim)' }}>
          No password required for this demo build.
        </p>
      </div>
    </div>
  );
}
