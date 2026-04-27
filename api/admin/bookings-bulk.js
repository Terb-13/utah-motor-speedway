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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdminSessionValid(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const s = getSupabase();
  if (s.error) {
    return res.status(503).json({
      error: 'Supabase is not configured',
    });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Invalid body' });
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (items.length > 200) {
    return res.status(400).json({ error: 'Too many items' });
  }
  const status = (body.status || '').toString().toLowerCase().trim();
  if (!STATUS.has(status)) {
    return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
  }

  const results = { ok: 0, failed: 0, errors: [] };
  for (const item of items) {
    const id = (item && item.id) || '';
    if (!id) {
      results.failed += 1;
      results.errors.push('missing id');
      continue;
    }
    const { data: before, error: e0 } = await s.supabase.from('bookings').select('*').eq('id', id).single();
    if (e0 || !before) {
      results.failed += 1;
      results.errors.push({ id, error: 'not found' });
      continue;
    }
    if ((before.status || '').toLowerCase() === status) {
      results.ok += 1;
      continue;
    }
    const { data, error } = await s.supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      results.failed += 1;
      results.errors.push({ id, error: error.message });
      continue;
    }
    results.ok += 1;
    try {
      await sendBookingStatusEmailIfNeeded({ after: data, beforeStatus: before.status });
    } catch (e) {
      console.error('[bookings-bulk] email', e);
    }
  }

  return res.status(200).json({ ok: true, ...results });
};
