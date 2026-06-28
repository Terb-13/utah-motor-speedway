/**
 * Public availability & schedule endpoint.
 * Used by customers and sales to see what's open and what's booked.
 */
const { createClient } = require('@supabase/supabase-js');
const {
  OPEN_DATES,
  CAMPUS_EVENTS,
  checkAvailability,
} = require('../lib/demoSchedule');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*'); // demo convenience

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Optional query: ?experience=track-day&date=2026-07-04 for booking modal check
  const queryExperience = (req.query && req.query.experience) || '';
  const queryDate = (req.query && req.query.date) || '';

  if (!url || !serviceKey) {
    // Still return schedule for demo when Supabase is offline
    const payload = {
      ok: true,
      today: new Date().toISOString().slice(0, 10),
      schedule: OPEN_DATES,
      events: CAMPUS_EVENTS,
      upcomingBookings: [],
      garages: [],
    };
    if (queryExperience && queryDate) {
      payload.check = checkAvailability(queryExperience, queryDate, []);
    }
    return res.status(200).json(payload);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('preferred_date, experience_type, status')
      .gte('preferred_date', today)
      .order('preferred_date', { ascending: true })
      .limit(50);

    if (bookingsError) throw bookingsError;

    const upcoming = (bookingsData || []).map((b) => ({
      date: b.preferred_date,
      experience: b.experience_type,
      status: b.status || 'pending',
    }));

    const { data: garagesData, error: garagesError } = await supabase
      .from('garages')
      .select('unit_number, size, status, notes')
      .order('unit_number', { ascending: true });

    if (garagesError) throw garagesError;

    const garages = (garagesData || []).map((g) => ({
      unit: g.unit_number,
      size: g.size,
      status: g.status,
      notes: g.notes || '',
    }));

    const payload = {
      ok: true,
      today,
      schedule: OPEN_DATES,
      events: CAMPUS_EVENTS,
      upcomingBookings: upcoming,
      garages,
    };

    if (queryExperience && queryDate) {
      payload.check = checkAvailability(queryExperience, queryDate, bookingsData || []);
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[api/availability]', err);
    return res.status(500).json({ error: 'Failed to load availability' });
  }
};
