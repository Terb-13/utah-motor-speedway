import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { fetchBookings, fetchWaitlist, type BookingRow } from '../lib/api';
import { formatDate, formatExperienceType } from '../lib/format';

function todayIso(): string {
  const t = new Date();
  return t.toISOString().slice(0, 10);
}

export function Dashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, w] = await Promise.all([fetchBookings(), fetchWaitlist()]);
        if (!cancelled) {
          setBookings(b);
          setWaitlistCount(w.length);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayIso();
  const upcoming = useMemo(() => {
    return [...bookings]
      .filter((b) => b.preferred_date >= today)
      .sort((a, c) => a.preferred_date.localeCompare(c.preferred_date))
      .slice(0, 12);
  }, [bookings, today]);

  const stats = useMemo(() => {
    const upcomingN = bookings.filter((b) => b.preferred_date >= today).length;
    return { total: bookings.length, upcoming: upcomingN };
  }, [bookings, today]);

  if (loading) {
    return <p style={{ color: 'var(--wf-text-dim)' }}>Loading dashboard…</p>;
  }
  if (error) {
    return <p style={{ color: '#f87171' }}>{error}</p>;
  }

  return (
    <div>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--wf-gold-muted)', margin: '0 0 0.5rem' }}>
        Overview
      </p>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 500, color: 'var(--wf-heading)' }}>
        Dashboard
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: '2rem',
        }}
      >
        <div style={statCard}>
          <div style={statLabel}>Total bookings</div>
          <div style={statValue}>{stats.total}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Upcoming (dated)</div>
          <div style={statValue}>{stats.upcoming}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Garage waitlist</div>
          <div style={statValue}>{waitlistCount ?? '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'var(--wf-heading)' }}>Upcoming bookings</h3>
        <Link to="/bookings" style={{ color: 'var(--wf-gold)', fontSize: '0.8rem', textDecoration: 'none' }}>
          View all →
        </Link>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--wf-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--wf-elevated)', textAlign: 'left' }}>
              <th style={th}>Date</th>
              <th style={th}>Experience</th>
              <th style={th}>Guest</th>
              <th style={th}>Party</th>
              <th style={th}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...td, color: 'var(--wf-text-dim)', textAlign: 'center', padding: '2rem' }}>
                  No upcoming bookings in range.
                </td>
              </tr>
            ) : (
              upcoming.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--wf-border)' }}>
                  <td style={td}>{formatDate(row.preferred_date)}</td>
                  <td style={td}>{formatExperienceType(row.experience_type)}</td>
                  <td style={td}>{row.full_name}</td>
                  <td style={td}>{row.party_size}</td>
                  <td style={td}>
                    <span style={{ color: 'var(--wf-text-dim)' }}>{row.email}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const statCard: CSSProperties = {
  padding: '1.1rem 1.25rem',
  borderRadius: 10,
  border: '1px solid var(--wf-border)',
  background: 'var(--wf-surface)',
};

const statLabel: React.CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--wf-text-dim)',
  marginBottom: 6,
};

const statValue: CSSProperties = {
  fontSize: '1.65rem',
  fontWeight: 600,
  color: 'var(--wf-heading)',
};

const th: CSSProperties = {
  padding: '0.85rem 1rem',
  color: 'var(--wf-text-dim)',
  fontWeight: 500,
  fontSize: '0.65rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '0.75rem 1rem',
  color: 'var(--wf-text)',
  verticalAlign: 'top',
};
