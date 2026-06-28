const { createClient } = require('@supabase/supabase-js');
const { isAdminSessionValid } = require('../../lib/adminSession');
const { parseJsonBody } = require('../../lib/parseJsonBody');

const ALLOWED_WAITLIST_STATUS = new Set(['New', 'Contacted', 'Qualified', 'Booked', 'Closed']);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('garage_waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/waitlist GET]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    return res.status(200).json({ ok: true, entries: data || [] });
  }

  if (req.method === 'PATCH') {
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
      const st = String(body.status).trim();
      if (!ALLOWED_WAITLIST_STATUS.has(st)) {
        return res.status(400).json({ error: 'Invalid status. Use New, Contacted, Qualified, Booked, or Closed' });
      }
      patch.status = st;
    }
    if (body.notes !== undefined) {
      const n = body.notes === null || body.notes === '' ? null : String(body.notes).trim();
      if (n && n.length > 4000) {
        return res.status(400).json({ error: 'Notes are too long' });
      }
      patch.notes = n;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Provide at least one of: status, notes' });
    }

    const { data, error } = await supabase
      .from('garage_waitlist')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[admin/waitlist PATCH]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }
    return res.status(200).json({ ok: true, entry: data });
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};
