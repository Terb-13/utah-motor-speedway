const { buildClearCookieHeader } = require('../../lib/adminSession');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', buildClearCookieHeader({ secure }));
  return res.status(200).json({ ok: true });
};
