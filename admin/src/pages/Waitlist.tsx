import { useEffect, useState, type CSSProperties } from 'react';
import { fetchWaitlist, type WaitlistRow } from '../lib/api';

export function Waitlist() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = await fetchWaitlist();
        if (!cancelled) setRows(w);
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

  if (loading) return <p style={{ color: 'var(--wf-text-dim)' }}>Loading waitlist…</p>;
  if (error) return <p style={{ color: '#f87171' }}>{error}</p>;

  return (
    <div>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--wf-gold-muted)', margin: '0 0 0.5rem' }}>
        Garages
      </p>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 500, color: 'var(--wf-heading)' }}>
        Private garage waitlist
      </h2>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--wf-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--wf-elevated)', textAlign: 'left' }}>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Phone</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...td, color: 'var(--wf-text-dim)', textAlign: 'center', padding: '2.5rem' }}>
                  No waitlist entries yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--wf-border)' }}>
                  <td style={td}>{row.full_name}</td>
                  <td style={td}>{row.email}</td>
                  <td style={td}>{row.phone}</td>
                  <td style={{ ...td, color: 'var(--wf-text-dim)', maxWidth: 280 }}>{row.notes || '—'}</td>
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
