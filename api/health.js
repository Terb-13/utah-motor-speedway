/**
 * GET /api/health
 * Liveness check for monitoring and deploy verification.
 */
module.exports = function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    ok: true,
    service: 'utah-motor-speedway',
    timestamp: new Date().toISOString(),
  });
};
