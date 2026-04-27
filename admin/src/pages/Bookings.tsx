import { useEffect, useState, type CSSProperties } from 'react';
import { fetchBookings, type BookingRow } from '../lib/api';
import { formatDate, formatExperienceType } from '../lib/format';

export function Bookings() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await fetchBookings();
        if (!cancelled) setRows(b);
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

  if (loading) return <p style={{ color: 'var(--wf-text-dim)' }}>Loading bookings…</p>;
  if (error) return <p style={{ color: '#f87171' }}>{error}</p>;

  return (
    <div>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--wf-gold-muted)', margin: '0 0 0.5rem' }}>
        Pipeline
      </p>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 500, color: 'var(--wf-heading)' }}>
        All bookings
      </h2>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--wf-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--wf-elevated)', textAlign: 'left' }}>
              <th style={th}>Date</th>
              <th style={th}>Experience</th>
              <th style={th}>Guest</th>
              <th style={th}>Party</th>
              <th style={th}>Email</th>
              <th style={th}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, color: 'var(--wf-text-dim)', textAlign: 'center', padding: '2.5rem' }}>
                  No bookings yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--wf-border)' }}>
                  <td style={td}>{formatDate(row.preferred_date)}</td>
                  <td style={td}>{formatExperienceType(row.experience_type)}</td>
                  <td style={td}>{row.full_name}</td>
                  <td style={td}>{row.party_size}</td>
                  <td style={td}>{row.email}</td>
                  <td style={td}>{row.phone}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
