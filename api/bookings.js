const { createClient } = require('@supabase/supabase-js');
const { parseJsonBody } = require('../lib/parseJsonBody');

const EXPERIENCE = new Set(['track-day', 'karting', 'rocket-rally']);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
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

  const experience_type = body.experience_type;
  const preferred_date = body.preferred_date;
  const party_size = body.party_size;
  const full_name = (body.full_name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();

  if (!experience_type || !EXPERIENCE.has(experience_type)) {
    return res.status(400).json({ error: 'Invalid experience_type' });
  }
  if (!preferred_date || !/^\d{4}-\d{2}-\d{2}$/.test(preferred_date)) {
    return res.status(400).json({ error: 'Invalid preferred_date' });
  }
  const n = parseInt(party_size, 10);
  if (!Number.isFinite(n) || n < 1 || n > 999) {
    return res.status(400).json({ error: 'Invalid party_size' });
  }
  if (!full_name || !email || !phone) {
    return res.status(400).json({ error: 'full_name, email, and phone are required' });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from('bookings').insert({
    experience_type,
    preferred_date,
    party_size: n,
    full_name,
    email,
    phone,
  }).select('id').single();

  if (error) {
    console.error('[bookings]', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }

  return res.status(201).json({ ok: true, id: data.id });
};
