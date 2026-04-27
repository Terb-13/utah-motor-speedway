const { createClient } = require('@supabase/supabase-js');
const { parseJsonBody } = require('../../lib/parseJsonBody');
const { isAdminSessionValid } = require('../../lib/adminSession');
const { sendBookingStatusEmailIfNeeded } = require('../../lib/bookingStatusEmail');

const STATUS = new Set(['pending', 'confirmed', 'cancelled']);

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: 'not_configured' };
  }
  return {
    supabase: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    if (!isAdminSessionValid(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const s = getSupabase();
    if (s.error) {
      return res.status(503).json({
        error: 'Supabase is not configured',
        hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      });
    }
    const { data, error } = await s.supabase
      .from('bookings')
      .select('*')
      .order('preferred_date', { ascending: true });
    if (error) {
      console.error('[admin/bookings GET]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    return res.status(200).json({ ok: true, bookings: data || [] });
  }

  if (req.method === 'PATCH') {
    if (!isAdminSessionValid(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const s = getSupabase();
    if (s.error) {
      return res.status(503).json({
        error: 'Supabase is not configured',
        hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      });
    }
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid body' });
    }
    const id = (body.id || '').toString().trim();
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const patch = {};
    if (body.status !== undefined && body.status !== null) {
      const st = (body.status || '').toString().toLowerCase().trim();
      if (!STATUS.has(st)) {
        return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
      }
      patch.status = st;
    }
    if (body.preferred_date !== undefined && body.preferred_date !== null) {
      const d = (body.preferred_date || '').toString().trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return res.status(400).json({ error: 'Invalid preferred_date' });
      }
      patch.preferred_date = d;
    }
    if (body.notes !== undefined) {
      const n = body.notes === null || body.notes === '' ? null : String(body.notes).trim();
      if (n && n.length > 4000) {
        return res.status(400).json({ error: 'Notes are too long' });
      }
      patch.notes = n;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Provide at least one of: status, preferred_date, notes' });
    }

    const { data: before, error: eBefore } = await s.supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (eBefore) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { data, error } = await s.supabase
      .from('bookings')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('[admin/bookings PATCH]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    if (patch.status) {
      try {
        await sendBookingStatusEmailIfNeeded({ after: data, beforeStatus: before.status });
      } catch (e) {
        console.error('[admin/bookings PATCH] email', e);
      }
    }

    return res.status(200).json({ ok: true, booking: data });
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};
