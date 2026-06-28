export function formatExperienceType(code: string): string {
  const map: Record<string, string> = {
    'track-day': 'Track Day',
    karting: 'Karting',
    'rocket-rally': 'Rocket Rally',
    event: 'Event',
  };
  return map[code] || code;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const INQUIRY_TYPES = ['Track Day', 'Karting', 'Rocket Rally', 'Garage Waitlist'] as const;

export function normalizeInquiryStatus(raw: string | null | undefined): string {
  const s = (raw || 'New').toString().trim();
  // Map legacy booking statuses to new pipeline labels
  if (s.toLowerCase() === 'pending') return 'New';
  if (s.toLowerCase() === 'confirmed') return 'Booked';
  if (s.toLowerCase() === 'cancelled') return 'Closed';
  // Accept canonical
  const allowed = ['New', 'Contacted', 'Qualified', 'Booked', 'Closed'];
  if (allowed.includes(s)) return s;
  return 'New';
}

export function getInquiryTypeLabel(experienceType?: string | null, source?: string): string {
  if (source === 'waitlist') return 'Garage Waitlist';
  return formatExperienceType(experienceType || '');
}
