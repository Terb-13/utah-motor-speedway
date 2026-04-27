const { isAdminSessionValid } = require('../../lib/adminSession');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdminSessionValid(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return res.status(200).json({ ok: true });
};
