/** Public endpoint to list available garages (for demo marketing site) */
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
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

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('garages')
    .select('id, unit_number, size, status, notes')
    .eq('status', 'Available')
    .order('unit_number', { ascending: true });

  if (error) {
    console.error('[api/garages]', error);
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json({ ok: true, garages: data || [] });
};
