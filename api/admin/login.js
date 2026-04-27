const crypto = require('crypto');
const { parseJsonBody } = require('../../lib/parseJsonBody');
const {
  signSessionToken,
  buildSetCookieHeader,
  getSigningSecret,
} = require('../../lib/adminSession');

function timingSafeEqualString(a, b) {
  const ha = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!expected) {
    return res.status(503).json({
      error: 'Admin login is not configured',
      hint: 'Set ADMIN_DASHBOARD_PASSWORD in environment variables',
    });
  }

  if (!getSigningSecret()) {
    return res.status(503).json({ error: 'Admin session signing is not configured' });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Invalid body' });
  }

  const password = body.password != null ? String(body.password) : '';
  if (!timingSafeEqualString(password, expected)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signSessionToken();
  if (!token) {
    return res.status(500).json({ error: 'Could not create session' });
  }

  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', buildSetCookieHeader(token, { secure }));
  return res.status(200).json({ ok: true });
};
