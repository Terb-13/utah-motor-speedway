import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEffect, useMemo, useState } from 'react';
import { fetchBookings, type BookingRow } from '../lib/api';
import { formatExperienceType } from '../lib/format';

export function CalendarPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await fetchBookings();
        if (!cancelled) setBookings(b);
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

  const events = useMemo(() => {
    return bookings.map((b) => ({
      id: b.id,
      title: `${formatExperienceType(b.experience_type)} · ${b.full_name} (${b.party_size})`,
      start: b.preferred_date,
      allDay: true,
      backgroundColor: 'rgba(197, 162, 111, 0.35)',
      borderColor: 'rgba(197, 162, 111, 0.85)',
      textColor: '#f5f0e8',
    }));
  }, [bookings]);

  if (loading) return <p style={{ color: 'var(--wf-text-dim)' }}>Loading calendar…</p>;
  if (error) return <p style={{ color: '#f87171' }}>{error}</p>;

  return (
    <div>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--wf-gold-muted)', margin: '0 0 0.5rem' }}>
        Schedule
      </p>
      <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.5rem', fontWeight: 500, color: 'var(--wf-heading)' }}>
        Booking calendar
      </h2>
      <div
        className="wf-calendar"
        style={{
          padding: '1rem',
          borderRadius: 10,
          border: '1px solid var(--wf-border)',
          background: 'var(--wf-surface)',
        }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          height="auto"
          events={events}
          eventDisplay="block"
        />
      </div>
    </div>
  );
}
