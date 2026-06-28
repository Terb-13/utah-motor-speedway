const { parseJsonBody } = require('../lib/parseJsonBody');

const GROK_URL = 'https://api.x.ai/v1/chat/completions';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL || 'grok-2-latest';

  if (!apiKey) {
    return res.status(503).json({
      error: 'Grok is not configured',
      hint: 'Set XAI_API_KEY in environment variables',
    });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Invalid body' });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const system =
    body.system ||
    'You are the Member Concierge for Wildfire Raceway at Utah Motorsports Campus (Grantsville, Utah).\n\n' +
    'Core offerings:\n' +
    '- Track Days: private circuit time for cars, motorcycles, and clubs.\n' +
    '- Karting: arrive-and-drive or private kart sessions.\n' +
    '- Rocket Rally: Wildfire’s signature 4-hour in-house experience using real rally cars + giant ball in a dirt arena (typically 3v3).\n' +
    '- Private Garages: waitlist program for long-term storage & member facilities.\n' +
    '- Events and corporate experiences available.\n\n' +
    'Rules:\n' +
    '- Be concise, warm, and professional. Never invent prices, policies, or availability.\n' +
    '- For booking or availability questions, explain options and offer to CREATE A DRAFT BOOKING.\n' +
    '- When a guest shows interest in booking, respond with a clear suggestion and encourage them to use the Draft Booking button.\n' +
    '- You may suggest experience types and general timing (“weekend dates”, “mid-week”, “next available”).\n' +
    '- Always end relevant replies by offering: "Would you like me to prepare a draft booking for you?"\n' +
    '- For garage interest, direct to the Garage Waitlist section and offer to note their interest.\n' +
    '- Do not mention external locations or competitors.\n\n' +
    'Response style examples:\n' +
    '• "Karting is very popular on weekends. I can prepare a draft Karting booking for you right now."\n' +
    '• "We have good availability mid-week for Track Days. Shall I draft a booking?"\n' +
    '• "Rocket Rally is our signature experience — 4 hours, teams of 3v3. Want me to open a draft booking?"\n';

  const grokMessages = [{ role: 'system', content: system }, ...messages];

  try {
    const grokRes = await fetch(GROK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model,
        messages: grokMessages,
        stream: false,
        temperature: 0.7,
      }),
    });

    const raw = await grokRes.text();
    if (!grokRes.ok) {
      console.error('[chat] Grok error', grokRes.status, raw);
      return res.status(502).json({
        error: 'Grok request failed',
        status: grokRes.status,
      });
    }

    const data = JSON.parse(raw);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Empty Grok response' });
    }

    return res.status(200).json({ message: content });
  } catch (e) {
    console.error('[chat]', e);
    return res.status(500).json({ error: 'Chat proxy error' });
  }
};
