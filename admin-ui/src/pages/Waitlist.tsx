import { useEffect, useState, type CSSProperties } from 'react';
import { fetchWaitlist, patchWaitlist, type WaitlistRow } from '../lib/api';
import { normalizeInquiryStatus } from '../lib/format';

export function Waitlist() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const w = await fetchWaitlist();
      setRows(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function saveStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const u = await patchWaitlist({ id, status });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: u.status } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  }

  async function saveNote(id: string, notes: string) {
    setBusyId(id);
    try {
      const n = notes.trim() || null;
      const u = await patchWaitlist({ id, notes: n });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, notes: u.notes } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  }

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
              <th style={th}>Email / Phone</th>
              <th style={th}>Status</th>
              <th style={{ ...th, minWidth: 200 }}>Notes</th>
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
                  <td style={td}><strong>{row.full_name}</strong></td>
                  <td style={td}>
                    <div>{row.email}</div>
                    <div style={{ color: 'var(--wf-text-dim)', fontSize: '0.8rem' }}>{row.phone}</div>
                  </td>
                  <td style={td}>
                    <select
                      className="wf-input-dark wf-input-compact"
                      value={normalizeInquiryStatus(row.status)}
                      disabled={busyId === row.id}
                      onChange={(e) => void saveStatus(row.id, e.target.value)}
                    >
                      {['New', 'Contacted', 'Qualified', 'Booked', 'Closed'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <textarea
                      className="wf-input-dark"
                      defaultValue={row.notes || ''}
                      rows={2}
                      style={{ width: '100%', fontSize: '0.82rem' }}
                      disabled={busyId === row.id}
                      onBlur={(e) => void saveNote(row.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--wf-text-dim)' }}>
        Prefer the unified view? Use the <a href="/" style={{ color: 'var(--wf-gold)' }}>Command Center</a>.
      </p>
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
