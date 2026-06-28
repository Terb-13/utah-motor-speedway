const { createClient } = require('@supabase/supabase-js');
const { isAdminSessionValid } = require('../../lib/adminSession');
const { parseJsonBody } = require('../../lib/parseJsonBody');

const ALLOWED_STATUS = new Set(['Available', 'Occupied', 'Reserved', 'Maintenance']);

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
      .from('garages')
      .select('*')
      .order('unit_number', { ascending: true });

    if (error) {
      console.error('[admin/garages GET]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    return res.status(200).json({ ok: true, garages: data || [] });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid body' });
    }

    const unit_number = (body.unit_number || '').toString().trim();
    const size = (body.size || 'Standard').toString().trim();
    const status = (body.status || 'Available').toString().trim();
    const tenant_name = body.tenant_name ? body.tenant_name.toString().trim() : null;
    const notes = body.notes ? body.notes.toString().trim() : null;

    if (!unit_number) {
      return res.status(400).json({ error: 'unit_number is required' });
    }
    if (!ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('garages')
      .insert({ unit_number, size, status, tenant_name, notes })
      .select()
      .single();

    if (error) {
      console.error('[admin/garages POST]', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A garage with that unit number already exists' });
      }
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    return res.status(201).json({ ok: true, garage: data });
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
    if (body.status !== undefined) {
      const st = String(body.status).trim();
      if (!ALLOWED_STATUS.has(st)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      patch.status = st;
    }
    if (body.tenant_name !== undefined) {
      patch.tenant_name = body.tenant_name ? String(body.tenant_name).trim() : null;
    }
    if (body.notes !== undefined) {
      patch.notes = body.notes ? String(body.notes).trim() : null;
    }
    if (body.size !== undefined) {
      patch.size = String(body.size).trim() || 'Standard';
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('garages')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[admin/garages PATCH]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Garage not found' });
    }
    return res.status(200).json({ ok: true, garage: data });
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};
