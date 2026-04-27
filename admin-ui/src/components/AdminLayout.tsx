import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/bookings', label: 'Bookings' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/waitlist', label: 'Waitlist' },
];

const pageTitle: Record<string, string> = {
  '/': 'Dashboard',
  '/bookings': 'Bookings',
  '/calendar': 'Calendar',
  '/waitlist': 'Waitlist',
};

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = pageTitle[pathname] ?? 'Admin';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="wf-sidebar-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            border: 'none',
            cursor: 'pointer',
          }}
        />
      ) : null}

      <aside
        className={`wf-sidebar${menuOpen ? ' is-open' : ''}`}
        style={{
          width: 260,
          flexShrink: 0,
          background: 'var(--wf-surface)',
          borderRight: '1px solid var(--wf-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transition: 'transform 0.22s ease',
        }}
      >
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--wf-border)' }}>
          <div
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--wf-gold)',
              marginBottom: '0.35rem',
            }}
          >
            Wildfire Raceway
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--wf-heading)',
              letterSpacing: '0.04em',
            }}
          >
            Admin
          </div>
        </div>
        <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'wf-nav-link is-active' : 'wf-nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--wf-border)' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--wf-border)',
              background: 'transparent',
              color: 'var(--wf-text-dim)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="wf-main-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--wf-border)',
            background: 'rgba(10, 10, 10, 0.92)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <button
            type="button"
            className="wf-menu-btn"
            onClick={() => setMenuOpen(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: '1px solid var(--wf-border)',
              background: 'var(--wf-elevated)',
              color: 'var(--wf-gold)',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 500,
              color: 'var(--wf-heading)',
              letterSpacing: '0.04em',
            }}
          >
            {title}
          </h1>
        </header>
        <main style={{ flex: 1, padding: '1.5rem 1.25rem 2.5rem' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .wf-menu-btn { display: none; }
        @media (max-width: 899px) {
          .wf-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
