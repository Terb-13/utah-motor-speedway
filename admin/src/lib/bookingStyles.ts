import type { BookingStatus } from './api';

export function normalizeStatus(raw: string | null | undefined): BookingStatus {
  const s = (raw || 'pending').toLowerCase();
  if (s === 'confirmed' || s === 'cancelled') return s;
  return 'pending';
}

export function eventColorsForStatus(status: BookingStatus): {
  backgroundColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'confirmed':
      return { backgroundColor: 'rgba(34, 197, 94, 0.4)', borderColor: 'rgb(22, 163, 74)' };
    case 'cancelled':
      return { backgroundColor: 'rgba(239, 68, 68, 0.38)', borderColor: 'rgb(220, 38, 38)' };
    default:
      return { backgroundColor: 'rgba(234, 179, 8, 0.38)', borderColor: 'rgb(202, 138, 4)' };
  }
}

export const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];
