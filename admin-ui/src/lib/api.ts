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

// Unified inquiry type for the Command Center pipeline (client-side merge)
export type InquirySource = 'booking' | 'waitlist';

export type Inquiry = {
  id: string; // original id
  source: InquirySource;
  // unified fields
  date: string; // preferred_date or created_at (YYYY-MM-DD)
  displayDate: string;
  name: string;
  email: string;
  phone: string;
  type: string; // 'Track Day' | 'Karting' | 'Rocket Rally' | 'Garage Waitlist'
  status: string;
  notes: string | null;
  raw: BookingRow | WaitlistRow;
};

export type PipelineStatus = 'New' | 'Contacted' | 'Qualified' | 'Booked' | 'Closed';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | PipelineStatus;

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
  status?: BookingStatus | PipelineStatus | string;
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

// Pipeline-friendly: mark status quickly for either source
export async function setInquiryStatus(source: InquirySource, id: string, status: string): Promise<void> {
  if (source === 'booking') {
    await patchBooking({ id, status: status as BookingStatus });
  } else {
    await patchWaitlist({ id, status });
  }
}

export async function setInquiryNotes(source: InquirySource, id: string, notes: string | null): Promise<BookingRow | WaitlistRow> {
  if (source === 'booking') {
    return patchBooking({ id, notes });
  } else {
    return patchWaitlist({ id, notes });
  }
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
  status?: string | null;
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

export type PatchWaitlistInput = {
  id: string;
  status?: string;
  notes?: string | null;
};

export async function patchWaitlist(input: PatchWaitlistInput): Promise<WaitlistRow> {
  const res = await fetch('/api/admin/waitlist', {
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
        'Failed to update waitlist entry'
    );
  }
  return (data as { entry: WaitlistRow }).entry;
}

// Garage Inventory types and functions
export type GarageStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';

export type GarageRow = {
  id: string;
  unit_number: string;
  size: string;
  status: GarageStatus;
  tenant_name?: string | null;
  notes?: string | null;
  created_at?: string;
};

export async function fetchGarages(): Promise<GarageRow[]> {
  const res = await fetch('/api/admin/garages', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load garages');
  }
  return (data as { garages?: GarageRow[] }).garages || [];
}

export type CreateGarageInput = {
  unit_number: string;
  size?: string;
  status?: GarageStatus;
  tenant_name?: string | null;
  notes?: string | null;
};

export async function createGarage(input: CreateGarageInput): Promise<GarageRow> {
  const res = await fetch('/api/admin/garages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to create garage');
  }
  return (data as { garage: GarageRow }).garage;
}

export type PatchGarageInput = {
  id: string;
  status?: GarageStatus;
  tenant_name?: string | null;
  notes?: string | null;
  size?: string;
};

export async function patchGarage(input: PatchGarageInput): Promise<GarageRow> {
  const res = await fetch('/api/admin/garages', {
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
        'Failed to update garage'
    );
  }
  return (data as { garage: GarageRow }).garage;
}
