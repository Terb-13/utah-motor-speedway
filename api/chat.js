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
    'You are a helpful assistant for Wildfire Raceway, a private racing club in Grantsville, Utah. Answer concisely about track days, karting, Rocket Rally (Wildfire’s in-house car-soccer experience: real rally cars and a giant ball on a dirt arena; typically 4-hour events, about $150 per person, 3v3 teams — confirm details with staff if unsure), events, and private garages (waitlist). Treat Rocket Rally as Wildfire Raceway’s own product; do not mention Las Vegas or other cities’ versions. Direct booking questions to the website booking flow. Do not invent policies or prices beyond what you were told here.';

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
