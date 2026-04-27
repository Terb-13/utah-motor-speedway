const jsonHeaders = { 'Content-Type': 'application/json' };

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Login failed');
  }
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function adminMe(): Promise<boolean> {
  const res = await fetch('/api/admin/me', { credentials: 'include' });
  return res.ok;
}

export type BookingRow = {
  id: string;
  experience_type: string;
  preferred_date: string;
  party_size: number;
  full_name: string;
  email: string;
  phone: string;
  notes?: string | null;
  status?: string | null;
  created_at?: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export async function fetchBookings(): Promise<BookingRow[]> {
  const res = await fetch('/api/admin/bookings', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load bookings');
  }
  return (data as { bookings?: BookingRow[] }).bookings || [];
}

export type PatchBookingInput = {
  id: string;
  status?: BookingStatus;
  preferred_date?: string;
  notes?: string | null;
};

export async function patchBooking(input: PatchBookingInput): Promise<BookingRow> {
  const res = await fetch('/api/admin/bookings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string; details?: string }).error ||
        (data as { details?: string }).details ||
        'Failed to update booking'
    );
  }
  return (data as { booking: BookingRow }).booking;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<BookingRow> {
  return patchBooking({ id, status });
}

export async function bulkSetBookingStatus(
  ids: string[],
  status: BookingStatus
): Promise<{ ok: number; failed: number; errors: unknown }> {
  const res = await fetch('/api/admin/bookings-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items: ids.map((id) => ({ id })), status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || 'Bulk update failed'
    );
  }
  return data as { ok: number; failed: number; errors: unknown };
}

export type WaitlistRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  notes?: string | null;
  created_at?: string;
};

export async function fetchWaitlist(): Promise<WaitlistRow[]> {
  const res = await fetch('/api/admin/waitlist', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load waitlist');
  }
  return (data as { entries?: WaitlistRow[] }).entries || [];
}
