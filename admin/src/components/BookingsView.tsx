import FullCalendar from '@fullcalendar/react';
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  bulkSetBookingStatus,
  fetchBookings,
  patchBooking,
  type BookingRow,
  type BookingStatus,
} from '../lib/api';
import { buildBookingTooltip, computeConflictDates, downloadBookingsCsv, toLocalYmd } from '../lib/bookingsHelpers';
import { eventColorsForStatus, normalizeStatus, STATUS_OPTIONS } from '../lib/bookingStyles';
import { formatDate, formatExperienceType } from '../lib/format';

const EXPERIENCE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'track-day', label: 'Track day' },
  { value: 'karting', label: 'Karting' },
  { value: 'rocket-rally', label: 'Rocket rally' },
  { value: 'event', label: 'Event' },
] as const;

const STATUS_FILTER = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type SortKey =
  | 'preferred_date'
  | 'experience_type'
  | 'full_name'
  | 'email'
  | 'party_size'
  | 'status'
  | 'notes';

const SORT_LABELS: Record<SortKey, string> = {
  preferred_date: 'Date',
  experience_type: 'Experience type',
  full_name: 'Name',
  email: 'Email',
  party_size: 'People',
  status: 'Status',
  notes: 'Notes',
};

type FocusMode = 'list' | 'calendar';

type SingleModal = { id: string; to: BookingStatus; name: string; from: BookingStatus } | null;
type BulkModal = { status: BookingStatus; count: number } | null;

function NotesCell({
  row,
  onSave,
  busy,
}: {
  row: BookingRow;
  onSave: (id: string, v: string) => Promise<void>;
  busy: boolean;
}) {
  const [v, setV] = useState(() => (row.notes || '').toString());
  useEffect(() => {
    setV((row.notes || '').toString());
  }, [row.id, row.notes]);
  return (
    <textarea
      className="wf-input-dark wf-notes-inline"
      value={v}
      disabled={busy}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v === (row.notes || '')) return;
        void onSave(row.id, v);
      }}
      rows={2}
      placeholder="Add notes…"
    />
  );
}

export function BookingsView({ focus = 'list' }: { focus?: FocusMode }) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [experience, setExperience] = useState<(typeof EXPERIENCE_FILTERS)[number]['value']>('all');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER)[number]['value']>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'preferred_date',
    dir: 'asc',
  });
  const [calSelectedId, setCalSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [singleModal, setSingleModal] = useState<SingleModal>(null);
  const [bulkModal, setBulkModal] = useState<BulkModal>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const didScrollFocus = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setActionError('');
    try {
      const b = await fetchBookings();
      setRows(b);
      setLastRefreshed(new Date());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load bookings');
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

  useEffect(() => {
    if (focus !== 'calendar' || didScrollFocus.current) return;
    const t = window.setTimeout(() => {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      didScrollFocus.current = true;
    }, 80);
    return () => clearTimeout(t);
  }, [focus, loading]);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const n = (r.full_name || '').toLowerCase();
      const em = (r.email || '').toLowerCase();
      return n.includes(q) || em.includes(q);
    });
  }, [rows, search]);

  const preFiltered = useMemo(() => {
    return searchFiltered.filter((r) => {
      const d = r.preferred_date;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (experience !== 'all' && r.experience_type !== experience) return false;
      if (statusFilter !== 'all' && normalizeStatus(r.status) !== statusFilter) return false;
      return true;
    });
  }, [searchFiltered, dateFrom, dateTo, experience, statusFilter]);

  const conflictDates = useMemo(() => computeConflictDates(preFiltered), [preFiltered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const sign = dir === 'asc' ? 1 : -1;
    if (key === 'party_size') {
      return [...preFiltered].sort((a, b) => (a.party_size - b.party_size) * sign);
    }
    const get = (r: BookingRow): string => {
      switch (key) {
        case 'preferred_date':
          return r.preferred_date;
        case 'experience_type':
          return r.experience_type;
        case 'full_name':
          return (r.full_name || '').toLowerCase();
        case 'email':
          return (r.email || '').toLowerCase();
        case 'status':
          return normalizeStatus(r.status);
        case 'notes':
          return (r.notes || '').toLowerCase();
        default:
          return '';
      }
    };
    return [...preFiltered].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return 0;
    });
  }, [preFiltered, sort]);

  const events = useMemo((): EventInput[] => {
    return sorted.map((b) => {
      const st = normalizeStatus(b.status);
      const colors = eventColorsForStatus(st);
      const hasConflict = conflictDates.has(b.preferred_date);
      return {
        id: b.id,
        title: `${formatExperienceType(b.experience_type)} — ${b.full_name} (${b.party_size} p)`,
        start: b.preferred_date,
        allDay: true,
        backgroundColor: colors.backgroundColor,
        borderColor: hasConflict ? '#f59e0b' : colors.borderColor,
        textColor: '#141414',
        classNames: hasConflict ? ['wf-cal-event', 'wf-cal-conflict'] : ['wf-cal-event'],
        extendedProps: { row: b, hasConflict, status: st },
      } as EventInput;
    });
  }, [sorted, conflictDates]);

  const onSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const applyBooking = useCallback((b: BookingRow) => {
    setRows((prev) => prev.map((r) => (r.id === b.id ? { ...r, ...b } : r)));
  }, []);

  const saveNotes = async (id: string, notes: string) => {
    setUpdatingId(id);
    setActionError('');
    try {
      const n = notes.trim() || null;
      const u = await patchBooking({ id, notes: n });
      applyBooking(u);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not save notes');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!singleModal) return;
    setUpdatingId(singleModal.id);
    setActionError('');
    try {
      const u = await patchBooking({ id: singleModal.id, status: singleModal.to });
      applyBooking(u);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setUpdatingId(null);
      setSingleModal(null);
    }
  };

  const onStatusSelect = (id: string, to: string, from: BookingStatus, name: string) => {
    if (!STATUS_OPTIONS.some((o) => o.value === to)) return;
    if (to === from) return;
    setSingleModal({ id, to: to as BookingStatus, from, name });
  };

  const runBulk = async () => {
    if (!bulkModal) return;
    setUpdatingId('__bulk__');
    setActionError('');
    const ids = [...selected];
    try {
      await bulkSetBookingStatus(ids, bulkModal.status);
      await load();
      setSelected(new Set());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Bulk update failed');
    } finally {
      setUpdatingId(null);
      setBulkModal(null);
    }
  };

  const onCalendarClick = (arg: EventClickArg) => {
    const id = arg.event.id;
    if (!id) return;
    setCalSelectedId(String(id));
    window.setTimeout(() => {
      document.getElementById(`wf-booking-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const onEventDrop = async (arg: EventDropArg) => {
    const id = String(arg.event.id);
    const start = arg.event.start;
    if (!start) {
      arg.revert();
      return;
    }
    const ymd = toLocalYmd(start);
    setUpdatingId(id);
    setActionError('');
    try {
      const u = await patchBooking({ id, preferred_date: ymd });
      applyBooking(u);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not move booking');
      arg.revert();
    } finally {
      setUpdatingId(null);
    }
  };

  const eventDidMount = (arg: { event: { extendedProps: { row?: BookingRow } }; el: HTMLElement }) => {
    const row = arg.event.extendedProps.row;
    if (row) arg.el.setAttribute('title', buildBookingTooltip(row));
  };

  const allVisibleSelected =
    sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const selectedCount = selected.size;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected((s) => {
        const n = new Set(s);
        sorted.forEach((r) => n.delete(r.id));
        return n;
      });
    } else {
      setSelected((s) => {
        const n = new Set(s);
        sorted.forEach((r) => n.add(r.id));
        return n;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const onExport = () => {
    const stamp = toLocalYmd(new Date());
    downloadBookingsCsv(sorted, `wildfire-bookings-${stamp}.csv`);
  };

  return (
    <div className="wf-bookings-root">
      {singleModal ? (
        <div className="wf-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wf-status-modal-title">
          <div className="wf-modal-panel">
            <h3 id="wf-status-modal-title" className="wf-modal-title">
              Confirm status change
            </h3>
            <p className="wf-modal-body">
              Set <strong>{singleModal.name}</strong> to{' '}
              <strong style={{ textTransform: 'capitalize' }}>{singleModal.to}</strong>?
            </p>
            <div className="wf-modal-actions">
              <button type="button" className="wf-btn-ghost" onClick={() => setSingleModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="wf-btn-primary"
                onClick={() => void confirmStatusChange()}
                disabled={updatingId === singleModal.id}
              >
                {updatingId === singleModal.id ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkModal ? (
        <div className="wf-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wf-bulk-modal-title">
          <div className="wf-modal-panel">
            <h3 id="wf-bulk-modal-title" className="wf-modal-title">
              Confirm bulk update
            </h3>
            <p className="wf-modal-body">
              Set <strong>{bulkModal.count}</strong> booking
              {bulkModal.count === 1 ? '' : 's'} to{' '}
              <strong style={{ textTransform: 'capitalize' }}>{bulkModal.status}</strong>?
            </p>
            <div className="wf-modal-actions">
              <button type="button" className="wf-btn-ghost" onClick={() => setBulkModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="wf-btn-primary"
                onClick={() => void runBulk()}
                disabled={updatingId === '__bulk__'}
              >
                {updatingId === '__bulk__' ? 'Updating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={toolbarStyle}>
        <div>
          <p style={eyebrowStyle}>Bookings</p>
          <h2 style={titleStyle}>{focus === 'calendar' ? 'Schedule & pipeline' : 'Pipeline & schedule'}</h2>
          {lastRefreshed ? (
            <p className="wf-meta-updated" style={metaStyle}>
              Last updated {lastRefreshed.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : null}
        </div>
        <div style={toolbarRowStyle} className="wf-toolbar-btns">
          {calSelectedId ? (
            <button type="button" onClick={() => setCalSelectedId(null)} className="wf-btn-touch" style={btnGhostStyle}>
              Clear highlight
            </button>
          ) : null}
          <button type="button" onClick={onExport} className="wf-btn-touch" style={btnGhostStyle} disabled={!sorted.length}>
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="wf-btn-touch"
            style={btnPrimaryStyle}
            aria-busy={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {(loadError || actionError) && (
        <div style={errorBoxStyle} role="alert">
          {loadError || actionError}
        </div>
      )}

      <div className="wf-filters-grid" style={filtersStyle} id="wf-booking-filters">
        <div style={fieldStyle} className="wf-filter-span-2">
          <label style={labelStyle} htmlFor="wf-search">
            Search
          </label>
          <input
            id="wf-search"
            type="search"
            className="wf-input-dark"
            placeholder="Name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wf-filter-from">
            From
          </label>
          <input
            id="wf-filter-from"
            type="date"
            className="wf-input-dark"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wf-filter-to">
            To
          </label>
          <input
            id="wf-filter-to"
            type="date"
            className="wf-input-dark"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wf-filter-exp">
            Experience
          </label>
          <select
            id="wf-filter-exp"
            className="wf-input-dark"
            value={experience}
            onChange={(e) => setExperience(e.target.value as typeof experience)}
          >
            {EXPERIENCE_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wf-filter-status">
            Status
          </label>
          <select
            id="wf-filter-status"
            className="wf-input-dark"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            {STATUS_FILTER.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setDateFrom('');
            setDateTo('');
            setExperience('all');
            setStatusFilter('all');
          }}
          style={linkBtnStyle}
        >
          Clear filters
        </button>
      </div>

      {selectedCount > 0 && (
        <div className="wf-bulk-bar" style={bulkBarStyle}>
          <span style={{ color: 'var(--wf-text)', fontSize: '0.875rem' }}>{selectedCount} selected</span>
          <div className="wf-bulk-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['pending', 'confirmed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className="wf-btn-touch"
                style={btnGhostStyle}
                onClick={() => setBulkModal({ status: s, count: selectedCount })}
                disabled={updatingId === '__bulk__'}
              >
                Set {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && !rows.length ? <BookingsTableSkeleton /> : null}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          marginTop: 12,
        }}
      >
        <div
          ref={calendarRef}
          id="wf-booking-calendar"
          style={{ ...calendarSectionStyle, order: focus === 'calendar' ? 1 : 2 }}
        >
          <h3 style={h3Style}>Calendar</h3>
          <p style={subStyle}>
            <strong>Drag</strong> an event to reschedule. Colors reflect status.{' '}
            <span className="wf-conflict-legend">Amber border</span> = multiple bookings the same day (review for
            conflicts). Day / Week / Month views — tooltips show full details.
          </p>
          <div className="wf-calendar" style={calendarBoxStyle}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,timeGridDay' }}
              height="auto"
              events={events}
              eventDisplay="block"
              editable
              eventStartEditable
              eventDurationEditable={false}
              longPressDelay={180}
              eventClick={onCalendarClick}
              eventDrop={onEventDrop}
              eventDidMount={eventDidMount}
            />
          </div>
        </div>

        <div style={{ order: focus === 'calendar' ? 2 : 1 }} id="wf-booking-table">
          <h3 style={h3Style}>All bookings</h3>
          <p style={subStyle}>
            {sorted.length} shown
            {preFiltered.length < rows.length ? ` · ${rows.length} total loaded` : ''}
          </p>
          {!loading && sorted.length === 0 && rows.length > 0 ? (
            <p className="wf-empty" style={emptyStateStyle}>
              No bookings match your search or filters. Try clearing filters or widening the date range.
            </p>
          ) : null}
          {!loading && rows.length === 0 ? (
            <p className="wf-empty" style={emptyStateStyle}>
              When guests submit the booking form on the site, their requests will appear here.
            </p>
          ) : null}
          <div className="wf-bookings-table-wrap" style={tableWrapStyle}>
            {loading && rows.length > 0 ? (
              <div className="wf-table-loading" style={tableLoadingOverlayStyle}>
                Updating…
              </div>
            ) : null}
            <table
              className="wf-bookings-table"
              style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem' }}
            >
              <thead>
                <tr>
                  <th style={{ ...thBase, width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="wf-check"
                      title="Select all visible"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible rows"
                    />
                  </th>
                  <SortableTh label={SORT_LABELS.preferred_date} active={sort.key === 'preferred_date'} dir={sort.dir} onClick={() => onSort('preferred_date')} />
                  <SortableTh label={SORT_LABELS.experience_type} active={sort.key === 'experience_type'} dir={sort.dir} onClick={() => onSort('experience_type')} />
                  <SortableTh label={SORT_LABELS.full_name} active={sort.key === 'full_name'} dir={sort.dir} onClick={() => onSort('full_name')} />
                  <SortableTh label={SORT_LABELS.email} active={sort.key === 'email'} dir={sort.dir} onClick={() => onSort('email')} />
                  <SortableTh label={SORT_LABELS.party_size} active={sort.key === 'party_size'} dir={sort.dir} onClick={() => onSort('party_size')} />
                  <SortableTh label={SORT_LABELS.status} active={sort.key === 'status'} dir={sort.dir} onClick={() => onSort('status')} />
                  <SortableTh label={SORT_LABELS.notes} active={sort.key === 'notes'} dir={sort.dir} onClick={() => onSort('notes')} />
                  <th style={thBase}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdBase, textAlign: 'center', color: 'var(--wf-text-dim)', padding: '2.5rem' }}>
                      —
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => {
                    const isCal = calSelectedId === row.id;
                    const st = normalizeStatus(row.status);
                    return (
                      <tr
                        key={row.id}
                        id={`wf-booking-row-${row.id}`}
                        style={{
                          background: isCal ? 'rgba(197, 162, 111, 0.08)' : 'transparent',
                          boxShadow: isCal ? 'inset 0 0 0 2px var(--wf-gold)' : 'none',
                          borderTop: '1px solid var(--wf-border)',
                        }}
                      >
                        <td style={{ ...tdBase, textAlign: 'center', width: 44 }}>
                          <input
                            type="checkbox"
                            className="wf-check"
                            checked={selected.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            aria-label={`Select ${row.full_name}`}
                          />
                        </td>
                        <td style={tdBase}>{formatDate(row.preferred_date)}</td>
                        <td style={tdBase}>{formatExperienceType(row.experience_type)}</td>
                        <td style={tdBase}>{row.full_name}</td>
                        <td style={tdBase}>
                          <a href={`mailto:${encodeURIComponent(row.email)}`} style={linkStyle}>
                            {row.email}
                          </a>
                        </td>
                        <td style={tdBase}>{row.party_size}</td>
                        <td style={tdBase}>
                          <StatusBadge status={st} />
                        </td>
                        <td style={notesStyle}>
                          <NotesCell
                            row={row}
                            busy={updatingId === row.id}
                            onSave={saveNotes}
                          />
                        </td>
                        <td style={tdBase}>
                          <select
                            className="wf-input-dark wf-input-compact"
                            value={st}
                            disabled={updatingId === row.id}
                            onChange={(e) => onStatusSelect(row.id, e.target.value, st, row.full_name)}
                            aria-label={`Change status for ${row.full_name}`}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingsTableSkeleton() {
  return (
    <div className="wf-skeleton" style={skeletonWrap} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="wf-skeleton-row" style={skeletonRow} />
      ))}
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <th className="wf-bookings-th-sort" style={thBase}>
      <button type="button" onClick={onClick} className="wf-th-sort-btn" aria-pressed={active}>
        {label}
        {active ? <span aria-hidden> {dir === 'asc' ? '▲' : '▼'}</span> : null}
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const S: Record<BookingStatus, { bg: string; fg: string; border: string; label: string }> = {
    pending: {
      label: 'Pending',
      bg: 'rgba(234, 179, 8, 0.14)',
      fg: 'rgb(254 240 138)',
      border: 'rgba(234, 179, 8, 0.4)',
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'rgba(34, 197, 94, 0.14)',
      fg: 'rgb(187 247 208)',
      border: 'rgba(34, 197, 94, 0.45)',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'rgba(239, 68, 68, 0.12)',
      fg: 'rgb(254 202 202)',
      border: 'rgba(239, 68, 68, 0.4)',
    },
  };
  const o = S[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25em 0.6em',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        background: o.bg,
        color: o.fg,
        border: `1px solid ${o.border}`,
      }}
    >
      {o.label}
    </span>
  );
}

const metaStyle: CSSProperties = { margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--wf-text-dim)' };
const toolbarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 8,
};

const toolbarRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 };
const emptyStateStyle: CSSProperties = {
  padding: '1rem 0.5rem 0',
  color: 'var(--wf-text-dim)',
  fontSize: '0.9rem',
  lineHeight: 1.5,
  maxWidth: 36 * 16,
};

const bulkBarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '0.75rem 1rem',
  marginBottom: 12,
  borderRadius: 10,
  border: '1px solid rgba(197, 162, 111, 0.25)',
  background: 'rgba(197, 162, 111, 0.06)',
};

const skeletonWrap: CSSProperties = { marginTop: 16, marginBottom: 16 };
const skeletonRow: CSSProperties = {
  height: 44,
  borderRadius: 8,
  marginBottom: 10,
  background: 'linear-gradient(90deg, var(--wf-elevated) 0%, rgba(255,255,255,0.06) 50%, var(--wf-elevated) 100%)',
  backgroundSize: '200% 100%',
  animation: 'wf-shimmer 1.2s ease-in-out infinite',
};

const tableLoadingOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3,
  color: 'var(--wf-heading)',
  fontSize: '0.85rem',
  fontWeight: 500,
  pointerEvents: 'none',
};

const eyebrowStyle: CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: 'var(--wf-gold-muted)',
  margin: '0 0 0.35rem',
};

const titleStyle: CSSProperties = { margin: 0, fontSize: '1.5rem', fontWeight: 500, color: 'var(--wf-heading)' };

const h3Style: CSSProperties = { margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 500, color: 'var(--wf-heading)' };
const subStyle: CSSProperties = { margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--wf-text-dim)' };

const errorBoxStyle: CSSProperties = {
  marginTop: 12,
  marginBottom: 8,
  padding: '0.75rem 1rem',
  borderRadius: 8,
  border: '1px solid rgba(248, 113, 113, 0.45)',
  background: 'rgba(127, 29, 29, 0.25)',
  color: '#fecaca',
  fontSize: '0.875rem',
};

const filtersStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 12,
  alignItems: 'end',
  marginBottom: 20,
  padding: '1rem 0',
  borderTop: '1px solid var(--wf-border)',
  borderBottom: '1px solid var(--wf-border)',
};

const fieldStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle: CSSProperties = { fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wf-text-dim)' };
const thBase: CSSProperties = {
  padding: '0.9rem 0.6rem',
  textAlign: 'left' as const,
  color: 'var(--wf-text-dim)',
  fontWeight: 500,
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  whiteSpace: 'nowrap' as const,
  background: 'var(--wf-elevated)',
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
  borderBottom: '1px solid var(--wf-border)',
};

const tdBase: CSSProperties = {
  padding: '0.75rem 0.6rem',
  color: 'var(--wf-text)',
  verticalAlign: 'top' as const,
};

const notesStyle: CSSProperties = {
  ...tdBase,
  maxWidth: 200,
  minWidth: 120,
  fontSize: '0.8rem',
  color: 'var(--wf-text-dim)',
  lineHeight: 1.45,
  wordBreak: 'break-word' as const,
};

const tableWrapStyle: CSSProperties = {
  position: 'relative' as const,
  overflowX: 'auto' as const,
  minHeight: 120,
  borderRadius: 10,
  border: '1px solid var(--wf-border)',
  background: 'var(--wf-surface)',
  marginTop: 8,
  maxWidth: '100%',
  WebkitOverflowScrolling: 'touch' as const,
};

const calendarSectionStyle: CSSProperties = { marginTop: 8 };
const calendarBoxStyle: CSSProperties = { padding: '1rem', borderRadius: 10, border: '1px solid var(--wf-border)', background: 'var(--wf-surface)' };

const btnPrimaryStyle: CSSProperties = {
  minHeight: 44,
  padding: '0.55rem 1.1rem',
  borderRadius: 8,
  border: '1px solid rgba(197, 162, 111, 0.45)',
  background: 'linear-gradient(180deg, rgba(212, 180, 135, 0.15), rgba(197, 162, 111, 0.08))',
  color: 'var(--wf-gold)',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnGhostStyle: CSSProperties = {
  ...btnPrimaryStyle,
  background: 'transparent',
  color: 'var(--wf-text-dim)',
  borderColor: 'var(--wf-border)',
};

const linkBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--wf-gold-muted)',
  fontSize: '0.8rem',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '0.25rem 0',
  justifySelf: 'start',
  gridColumn: '1 / -1' as const,
};

const linkStyle: CSSProperties = { color: 'var(--wf-gold)', textDecoration: 'none' };
