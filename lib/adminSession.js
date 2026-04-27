const crypto = require('crypto');

const COOKIE_NAME = 'wf_admin_session';
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function getSigningSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || null;
}

function signSessionToken() {
  const secret = getSigningSecret();
  if (!secret) return null;
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = Buffer.from(JSON.stringify({ exp }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(raw) {
  const secret = getSigningSecret();
  if (!secret || !raw || typeof raw !== 'string') return false;
  const parts = raw.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (!data.exp || typeof data.exp !== 'number' || data.exp < Date.now()) return false;
  return true;
}

function parseCookies(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  header.split(';').forEach(function (part) {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function getSessionCookie(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[COOKIE_NAME] || null;
}

function isAdminSessionValid(req) {
  return verifySessionToken(getSessionCookie(req));
}

function buildSetCookieHeader(token, opts) {
  const secure = opts && opts.secure;
  const parts = [
    COOKIE_NAME + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + MAX_AGE_SEC,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function buildClearCookieHeader(opts) {
  const secure = opts && opts.secure;
  const parts = [COOKIE_NAME + '=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

module.exports = {
  COOKIE_NAME,
  getSigningSecret,
  signSessionToken,
  verifySessionToken,
  getSessionCookie,
  isAdminSessionValid,
  buildSetCookieHeader,
  buildClearCookieHeader,
};
