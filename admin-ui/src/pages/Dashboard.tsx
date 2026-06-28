import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchBookings,
  fetchWaitlist,
  fetchGarages,
  createGarage,
  patchGarage,
  patchBooking,
  patchWaitlist,
  type BookingRow,
  type WaitlistRow,
  type Inquiry,
  type GarageRow,
  type GarageStatus,
} from '../lib/api';
import {
  formatDate,
  formatExperienceType,
  formatShortDate,
  normalizeInquiryStatus,
  getInquiryTypeLabel,
} from '../lib/format';

const PIPELINE_STATUSES = ['New', 'Contacted', 'Qualified', 'Booked', 'Closed'] as const;
type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

const TYPE_FILTERS = ['All', 'Track Day', 'Karting', 'Rocket Rally', 'Garage Waitlist'] as const;

function todayIso(): string {
  const t = new Date();
  return t.toISOString().slice(0, 10);
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function toInquiry(b?: BookingRow, w?: WaitlistRow): Inquiry | null {
  if (b) {
    const st = normalizeInquiryStatus(b.status);
    const dt = b.preferred_date || (b.created_at ? b.created_at.slice(0, 10) : todayIso());
    return {
      id: b.id,
      source: 'booking',
      date: dt,
      displayDate: formatDate(dt),
      name: b.full_name || '—',
      email: b.email || '—',
      phone: b.phone || '—',
      type: getInquiryTypeLabel(b.experience_type, 'booking'),
      status: st,
      notes: b.notes || null,
      raw: b,
    };
  }
  if (w) {
    const created = w.created_at ? w.created_at.slice(0, 10) : todayIso();
    return {
      id: w.id,
      source: 'waitlist',
      date: created,
      displayDate: formatShortDate(created),
      name: w.full_name || '—',
      email: w.email || '—',
      phone: w.phone || '—',
      type: 'Garage Waitlist',
      status: normalizeInquiryStatus(w.status),
      notes: w.notes || null,
      raw: w,
    };
  }
  return null;
}

export function Dashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [garages, setGarages] = useState<GarageRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // New garage form state
  const [newUnit, setNewUnit] = useState('');
  const [newSize, setNewSize] = useState('Standard');
  const [newNotes, setNewNotes] = useState('');

  // Filters & view
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | PipelineStatus>('All');
  const [view, setView] = useState<'pipeline' | 'schedule' | 'garage' | 'units'>('pipeline');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [b, w, g] = await Promise.all([fetchBookings(), fetchWaitlist(), fetchGarages()]);
      setBookings(b || []);
      setWaitlist(w || []);
      setGarages(g || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  const today = todayIso();
  const monthStart = getMonthStart();

  const inquiries: Inquiry[] = useMemo(() => {
    const fromB = bookings.map((b) => toInquiry(b)).filter(Boolean) as Inquiry[];
    const fromW = waitlist.map((w) => toInquiry(undefined, w)).filter(Boolean) as Inquiry[];
    return [...fromB, ...fromW].sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, waitlist]);

  const metrics = useMemo(() => {
    const thisMonth = inquiries.filter((i) => i.date >= monthStart).length;

    const expCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      const t = getInquiryTypeLabel(b.experience_type);
      expCounts[t] = (expCounts[t] || 0) + 1;
    });
    let topExp = '—';
    let topCount = 0;
    Object.entries(expCounts).forEach(([k, v]) => {
      if (v > topCount) {
        topCount = v;
        topExp = k;
      }
    });

    const garageCount = waitlist.length;
    const availableGarages = garages.filter((g) => g.status === 'Available').length;
    const booked = inquiries.filter((i) => i.status === 'Booked' || i.status === 'confirmed').length;
    const conv = inquiries.length > 0 ? Math.round((booked / inquiries.length) * 100) : 0;

    return {
      thisMonth,
      topExp: topExp || '—',
      garageCount,
      availableGarages,
      conversion: `${conv}%`,
    };
  }, [inquiries, bookings, waitlist, garages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (q) {
        const hay = `${i.name} ${i.email} ${i.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== 'All' && i.type !== typeFilter) return false;
      if (statusFilter !== 'All' && i.status !== statusFilter) return false;
      if (view === 'schedule') return i.source === 'booking' && i.date >= today;
      if (view === 'garage') return i.source === 'waitlist';
      return true;
    });
  }, [inquiries, search, typeFilter, statusFilter, view, today]);

  const schedule = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const endIso = end.toISOString().slice(0, 10);
    return bookings
      .filter((b) => b.preferred_date >= today && b.preferred_date <= endIso)
      .sort((a, b) => a.preferred_date.localeCompare(b.preferred_date))
      .map((b) => toInquiry(b)!)
      .filter(Boolean);
  }, [bookings, today]);

  const garageList = useMemo(() => {
    return [...waitlist]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .map((w) => toInquiry(undefined, w)!)
      .filter(Boolean);
  }, [waitlist]);

  const activeList = view === 'schedule' ? schedule : view === 'garage' ? garageList : view === 'units' ? garages : filtered;

  async function updateStatus(inq: Inquiry, newStatus: string) {
    if (inq.status === newStatus) return;
    setActionBusy(inq.id);
    setError('');
    try {
      if (inq.source === 'booking') {
        await patchBooking({ id: inq.id, status: newStatus as any });
        setBookings((prev) => prev.map((r) => (r.id === inq.id ? { ...r, status: newStatus } : r)));
      } else {
        await patchWaitlist({ id: inq.id, status: newStatus });
        setWaitlist((prev) => prev.map((r) => (r.id === inq.id ? { ...r, status: newStatus } : r)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActionBusy(null);
    }
  }

  async function quickMark(inq: Inquiry, target: 'Contacted' | 'Booked') {
    await updateStatus(inq, target);
  }

  async function saveNotes(inq: Inquiry, notes: string) {
    const n = notes.trim() ? notes.trim() : null;
    if (n === (inq.notes || null)) return;
    setActionBusy(inq.id);
    setError('');
    try {
      if (inq.source === 'booking') {
        const updated = await patchBooking({ id: inq.id, notes: n });
        setBookings((prev) => prev.map((r) => (r.id === inq.id ? { ...r, notes: updated.notes } : r)));
      } else {
        const updated = await patchWaitlist({ id: inq.id, notes: n });
        setWaitlist((prev) => prev.map((r) => (r.id === inq.id ? { ...r, notes: updated.notes } : r)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save note');
    } finally {
      setActionBusy(null);
    }
  }

  function handleNotesBlur(e: React.FocusEvent<HTMLTextAreaElement>, inq: Inquiry) {
    void saveNotes(inq, e.target.value);
  }

  // Garage inventory handlers
  async function addNewGarage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newUnit.trim()) return;
    setActionBusy('new-garage');
    setError('');
    try {
      const g = await createGarage({
        unit_number: newUnit.trim(),
        size: newSize,
        notes: newNotes.trim() || null,
      });
      setGarages((prev) => [...prev, g].sort((a, b) => a.unit_number.localeCompare(b.unit_number)));
      setNewUnit('');
      setNewNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add garage');
    } finally {
      setActionBusy(null);
    }
  }

  async function updateGarageStatus(id: string, status: GarageStatus) {
    setActionBusy(id);
    setError('');
    try {
      const updated = await patchGarage({ id, status });
      setGarages((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActionBusy(null);
    }
  }

  async function saveGarageNotes(id: string, notes: string) {
    const n = notes.trim() || null;
    const current = garages.find((g) => g.id === id);
    if (!current || n === current.notes) return;
    setActionBusy(id);
    setError('');
    try {
      const updated = await patchGarage({ id, notes: n });
      setGarages((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save notes');
    } finally {
      setActionBusy(null);
    }
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--wf-text-dim)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--wf-gold)' }}>
            WILDFIRE RACEWAY
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--wf-heading)', marginTop: 4 }}>
            Command Center
          </div>
        </div>
        <div className="wf-skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 16 }} />
        <p style={{ fontSize: '0.85rem' }}>Loading operations data…</p>
      </div>
    );
  }

  if (error && !inquiries.length) {
    return <p style={{ color: '#f87171' }}>{error}</p>;
  }

  return (
    <div>
      {/* Header + Vision */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--wf-gold)',
            marginBottom: 2,
          }}
        >
          WILDFIRE RACEWAY
        </div>
        <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 600, color: 'var(--wf-heading)', letterSpacing: '0.01em' }}>
          Command Center
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--wf-text-dim)', fontSize: '0.92rem' }}>
          Run your business from here. Track inquiries, manage the garage waitlist, and stay on top of today’s schedule.
        </p>
      </div>

      {/* Utilization Snapshot */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--wf-gold-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          Utilization Snapshot
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))',
            gap: 12,
          }}
        >
          <SnapshotCard label="Inquiries this month" value={metrics.thisMonth} />
          <SnapshotCard label="Top requested" value={metrics.topExp} sub="experience" />
          <SnapshotCard label="Available garages" value={metrics.availableGarages} />
          <SnapshotCard label="Garage waitlist" value={metrics.garageCount} />
          <SnapshotCard label="Conversion" value={metrics.conversion} sub="Booked / inquiries" />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--wf-gold-muted)', marginRight: 8 }}>VIEW</div>
        {(['pipeline', 'schedule', 'garage', 'units'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              ...segBtn,
              background: view === v ? 'rgba(197,162,111,0.14)' : 'transparent',
              borderColor: view === v ? 'rgba(197,162,111,0.4)' : 'var(--wf-border)',
              color: view === v ? 'var(--wf-gold)' : 'var(--wf-text-dim)',
            }}
          >
            {v === 'pipeline' ? 'Inquiries Pipeline' : v === 'schedule' ? "Today’s Schedule" : v === 'garage' ? 'Garage Interest' : 'Garage Inventory'}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button onClick={() => void load()} disabled={loading} style={refreshBtn}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <Link to="/bookings" style={{ fontSize: '0.8rem', color: 'var(--wf-gold)' }}>Full Bookings →</Link>
      </div>

      {/* Filters (hidden for schedule and units) */}
      {view !== 'schedule' && view !== 'units' && (
        <div style={filterBar}>
          <input
            type="text"
            value={search}
            placeholder="Search name, email or phone…"
            onChange={(e) => setSearch(e.target.value)}
            className="wf-input-dark"
            style={{ minWidth: 220, flex: '1 1 220px' }}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="wf-input-dark">
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="wf-input-dark">
            <option value="All">All statuses</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All'); }} style={clearBtn}>
            Clear
          </button>
        </div>
      )}

      {/* Garage Inventory Add Form */}
      {view === 'units' && (
        <form onSubmit={addNewGarage} style={{ ...filterBar, marginBottom: 16, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--wf-text-dim)' }}>Unit #</label>
            <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="A-15" className="wf-input-dark" required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--wf-text-dim)' }}>Size</label>
            <select value={newSize} onChange={(e) => setNewSize(e.target.value)} className="wf-input-dark">
              <option>Standard</option>
              <option>Large</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '2 1 260px' }}>
            <label style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--wf-text-dim)' }}>Notes</label>
            <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes (climate, height, access...)" className="wf-input-dark" />
          </div>
          <button type="submit" disabled={actionBusy === 'new-garage' || !newUnit.trim()} style={refreshBtn}>
            {actionBusy === 'new-garage' ? 'Adding…' : '+ Add Garage'}
          </button>
        </form>
      )}

      {error && (
        <div style={{ color: '#fecaca', background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(248,113,113,0.4)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Main table or Garage Inventory */}
      <div style={{ border: '1px solid var(--wf-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--wf-surface)' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--wf-border)', background: 'var(--wf-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--wf-text-dim)', textTransform: 'uppercase' }}>
              {view === 'pipeline' && 'ALL INQUIRIES'}
              {view === 'schedule' && "TODAY + NEXT 7 DAYS"}
              {view === 'garage' && 'GARAGE WAITLIST INTEREST'}
              {view === 'units' && 'GARAGE INVENTORY'}
            </div>
            <div style={{ color: 'var(--wf-heading)', fontWeight: 500, fontSize: '1.02rem' }}>
              {view === 'pipeline' ? `${activeList.length} inquiries` : view === 'schedule' ? `${activeList.length} upcoming` : view === 'garage' ? `${activeList.length} interested` : `${garages.length} units`}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--wf-text-dim)' }}>
            {activeList.length} shown
          </div>
        </div>

        {view === 'units' ? (
          /* Garage Inventory Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--wf-elevated)' }}>
                  <th style={thCell}>Unit</th>
                  <th style={thCell}>Size</th>
                  <th style={thCell}>Status</th>
                  <th style={thCell}>Tenant / Notes</th>
                  <th style={thCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {garages.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--wf-text-dim)' }}>
                      No garages yet. Add the first unit above.
                    </td>
                  </tr>
                ) : (
                  garages.map((g) => {
                    const busy = actionBusy === g.id;
                    return (
                      <tr key={g.id} style={{ borderTop: '1px solid var(--wf-border)' }}>
                        <td style={tdCell}><strong style={{ color: 'var(--wf-heading)' }}>{g.unit_number}</strong></td>
                        <td style={tdCell}>{g.size}</td>
                        <td style={tdCell}>
                          <select
                            value={g.status}
                            disabled={busy}
                            onChange={(e) => void updateGarageStatus(g.id, e.target.value as GarageStatus)}
                            className="wf-input-dark wf-input-compact"
                            style={{ minWidth: 110, fontSize: '0.8rem' }}
                          >
                            {(['Available', 'Occupied', 'Reserved', 'Maintenance'] as const).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...tdCell, minWidth: 240 }}>
                          <input
                            defaultValue={g.tenant_name || ''}
                            placeholder="Tenant name"
                            className="wf-input-dark"
                            style={{ width: '100%', fontSize: '0.8rem', marginBottom: 4 }}
                            onBlur={(e) => {
                              const val = e.target.value.trim() || null;
                              if (val !== (g.tenant_name || null)) {
                                void patchGarage({ id: g.id, tenant_name: val }).then((u) =>
                                  setGarages((prev) => prev.map((gg) => (gg.id === g.id ? u : gg)))
                                );
                              }
                            }}
                          />
                          <textarea
                            defaultValue={g.notes || ''}
                            rows={1}
                            placeholder="Internal notes"
                            className="wf-input-dark"
                            style={{ width: '100%', fontSize: '0.78rem', minHeight: 34 }}
                            onBlur={(e) => void saveGarageNotes(g.id, e.target.value)}
                            disabled={busy}
                          />
                        </td>
                        <td style={tdCell}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => void updateGarageStatus(g.id, 'Available')} disabled={busy || g.status === 'Available'} style={miniAction}>Mark Available</button>
                            <button onClick={() => void updateGarageStatus(g.id, 'Occupied')} disabled={busy || g.status === 'Occupied'} style={{ ...miniAction, background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>Mark Occupied</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Regular Inquiries / Schedule / Garage Interest Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--wf-elevated)' }}>
                  <th style={thCell}>Date</th>
                  <th style={thCell}>Name</th>
                  <th style={thCell}>Email</th>
                  <th style={thCell}>Phone</th>
                  <th style={thCell}>Type</th>
                  <th style={thCell}>Status</th>
                  <th style={{ ...thCell, minWidth: 220 }}>Notes</th>
                  <th style={thCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--wf-text-dim)' }}>
                      {view === 'schedule' ? 'No bookings scheduled in the next 7 days.' : 'No matching records.'}
                    </td>
                  </tr>
                ) : (
                  activeList.map((inq) => {
                    const busy = actionBusy === inq.id;
                    return (
                      <tr key={`${inq.source}-${inq.id}`} style={{ borderTop: '1px solid var(--wf-border)' }}>
                        <td style={tdCell}>{inq.displayDate}</td>
                        <td style={tdCell}><strong>{inq.name}</strong></td>
                        <td style={tdCell}>
                          <a href={`mailto:${inq.email}`} style={{ color: 'var(--wf-gold)' }}>{inq.email}</a>
                        </td>
                        <td style={tdCell}>{inq.phone}</td>
                        <td style={tdCell}><span style={typePill}>{inq.type}</span></td>
                        <td style={tdCell}>
                          <select
                            value={inq.status}
                            disabled={busy}
                            onChange={(e) => void updateStatus(inq, e.target.value)}
                            className="wf-input-dark wf-input-compact"
                            style={{ minWidth: 108, fontSize: '0.8rem' }}
                          >
                            {PIPELINE_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...tdCell, minWidth: 220 }}>
                          <textarea
                            defaultValue={inq.notes || ''}
                            onBlur={(e) => handleNotesBlur(e, inq)}
                            disabled={busy}
                            rows={2}
                            placeholder="Internal notes…"
                            className="wf-input-dark"
                            style={{ width: '100%', fontSize: '0.8rem', resize: 'vertical', minHeight: 42 }}
                          />
                        </td>
                        <td style={tdCell}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button disabled={busy} onClick={() => void quickMark(inq, 'Contacted')} style={miniAction}>
                              Mark Contacted
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => void quickMark(inq, 'Booked')}
                              style={{ ...miniAction, background: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.4)' }}
                            >
                              Mark Booked
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--wf-text-dim)' }}>
        {view === 'units' 
          ? 'Garage statuses: Available → Occupied / Reserved / Maintenance. Use Team Access at the bottom of the public site to reach this Command Center.'
          : 'Status pipeline: New → Contacted → Qualified → Booked / Closed. Notes autosave on blur.'}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/bookings" style={quickLink}>Manage all bookings &amp; calendar →</Link>
        <Link to="/waitlist" style={quickLink}>Legacy waitlist view →</Link>
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={snapCard}>
      <div style={snapLabel}>{label}</div>
      <div style={snapValue}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--wf-text-dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const snapCard: CSSProperties = {
  padding: '14px 16px',
  background: 'var(--wf-surface)',
  border: '1px solid var(--wf-border)',
  borderRadius: 10,
};
const snapLabel: CSSProperties = { fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wf-text-dim)' };
const snapValue: CSSProperties = { fontSize: '1.55rem', fontWeight: 600, color: 'var(--wf-heading)', marginTop: 2, lineHeight: 1.1 };

const thCell: CSSProperties = {
  padding: '10px 12px',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--wf-text-dim)',
  textAlign: 'left',
  fontWeight: 500,
  borderBottom: '1px solid var(--wf-border)',
  whiteSpace: 'nowrap',
};
const tdCell: CSSProperties = {
  padding: '10px 12px',
  color: 'var(--wf-text)',
  verticalAlign: 'top',
  fontSize: '0.875rem',
};

const typePill: CSSProperties = {
  display: 'inline-block',
  fontSize: '0.72rem',
  padding: '1px 8px',
  borderRadius: 999,
  background: 'rgba(197,162,111,0.12)',
  color: 'var(--wf-gold)',
  border: '1px solid rgba(197,162,111,0.25)',
};

const filterBar: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '1px solid var(--wf-border)',
};

const segBtn: CSSProperties = {
  border: '1px solid var(--wf-border)',
  background: 'transparent',
  color: 'var(--wf-text-dim)',
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const refreshBtn: CSSProperties = {
  border: '1px solid var(--wf-border)',
  background: 'transparent',
  color: 'var(--wf-text-dim)',
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const clearBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--wf-gold-muted)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  padding: '4px 8px',
};

const miniAction: CSSProperties = {
  fontSize: '0.72rem',
  padding: '4px 9px',
  borderRadius: 6,
  border: '1px solid rgba(197,162,111,0.35)',
  background: 'rgba(197,162,111,0.08)',
  color: 'var(--wf-gold)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const quickLink: CSSProperties = {
  color: 'var(--wf-gold)',
  fontSize: '0.85rem',
  textDecoration: 'none',
};
