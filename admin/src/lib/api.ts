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
  created_at?: string;
};

export async function fetchBookings(): Promise<BookingRow[]> {
  const res = await fetch('/api/admin/bookings', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load bookings');
  }
  return (data as { bookings?: BookingRow[] }).bookings || [];
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
