/**
 * Notify guest when a booking is confirmed or cancelled.
 * If RESEND_API_KEY + BOOKING_FROM_EMAIL are set, sends via Resend; otherwise logs only.
 */
async function sendBookingStatusEmailIfNeeded({ after, beforeStatus }) {
  const next = (after.status || '').toLowerCase();
  const prev = (beforeStatus || '').toLowerCase();
  if (next === prev) return;
  if (next !== 'confirmed' && next !== 'cancelled') return;

  const to = (after.email || '').trim();
  if (!to) {
    console.warn('[bookingStatusEmail] no email on booking', after.id);
    return;
  }

  const name = (after.full_name || 'Guest').trim();
  const experience = (after.experience_type || '').replace(/-/g, ' ');
  const date = (after.preferred_date || '').toString();
  const subject =
    next === 'confirmed'
      ? `Your Wildfire Raceway request is confirmed — ${date}`
      : `Update on your Wildfire Raceway request — ${date}`;

  const text =
    next === 'confirmed'
      ? `Hi ${name},\n\n` +
        `Your booking request is confirmed for ${date} (${experience}).\n\n` +
        `We will follow up with any final details.\n\n` +
        `— Wildfire Raceway`
      : `Hi ${name},\n\n` +
        `Your booking request for ${date} (${experience}) has been cancelled.\n\n` +
        `If you have questions, reply to this message.\n\n` +
        `— Wildfire Raceway`;

  const resend = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL || 'bookings@example.com';
  if (!resend) {
    console.log('[bookingStatusEmail:placeholder] would send to', to, { subject, lines: text.split('\n').length });
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resend}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[bookingStatusEmail] Resend error', res.status, errText);
  }
}

module.exports = { sendBookingStatusEmailIfNeeded };
