const { createClient } = require('@supabase/supabase-js');
const { parseJsonBody } = require('../lib/parseJsonBody');

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

  const full_name = (body.full_name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const notes = body.notes != null ? String(body.notes).trim() : null;

  if (!full_name || !email || !phone) {
    return res.status(400).json({ error: 'full_name, email, and phone are required' });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from('garage_waitlist').insert({
    full_name,
    email,
    phone,
    notes: notes || null,
  }).select('id').single();

  if (error) {
    console.error('[waitlist]', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }

  return res.status(201).json({ ok: true, id: data.id });
};
