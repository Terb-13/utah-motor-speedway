const { createClient } = require('@supabase/supabase-js');
const { isAdminSessionValid } = require('../../lib/adminSession');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdminSessionValid(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(503).json({
      error: 'Supabase is not configured',
      hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('preferred_date', { ascending: true });

  if (error) {
    console.error('[admin/bookings]', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }

  return res.status(200).json({ ok: true, bookings: data || [] });
};
