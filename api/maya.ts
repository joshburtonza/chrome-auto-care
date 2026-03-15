import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const MAYA_SYSTEM = `You are Maya — the AI assistant for Race Technik, a premium automotive care workshop in Johannesburg, South Africa.

You live inside the Race Technik client and staff app. You help clients understand services, get quotes, and manage their bookings. You help staff with job info, pricing, and quick answers.

You know cars deeply. You're warm, direct, and to the point. South African English. No corporate speak. No "Great question!" filler. Match the user's energy.

## Services and Pricing

**Paint Protection Film (PPF)**
Full Body: Edge R51,750 | 9+ R63,250 | Satin R63,250 | Stealth R63,250 | 10+ R74,750 | PTS (Colour) R86,250
Frontal: Edge R20,700 | 9+ R23,000 | 10+ R28,750
Pro (partial): Edge R2,415 | Stealth R2,990 | Satin R2,990 | 9+ R3,220 | Carbon R3,450 | PTS R3,450 | 10+ R3,910 | Vision R2,875
Pro+ Windscreen Protection: R6,325

Film grades: Edge (K90) = entry-level chip protection | 9+/V9 = mid self-healing | Satin (ST) = self-healing satin finish | Stealth (DM) = self-healing matte | 10+/V10 = top-tier clarity | PTS = coloured PPF full colour change

**Ceramic Coatings**
Lite (spray-on) R3,000 | Interior R1,725 | Wheel + Caliper R3,450 | Ceramic Film (on PPF/vinyl) R6,325 | 3 Year R6,325 | 5 Year R8,970 | 7 Year R14,375

**Window Tinting**
Edge Tint R2,300 | Pro Tint R2,875 | Pro Windscreen (Fixed %) R2,875 | Pro+ Smart-Tint (photochromic) R6,325

**Detailing**
Maintain (wash) R402.50 | Interior Detail R1,725 | Exterior Detail R2,300 | Complete Detail R3,450
Paint Correction: Stage 1 R2,875 | Stage 2 R4,600 | Stage 3 R5,750 | Stage 4 R9,200
Interior Resto R17,250 | Wheel Respray R8,500

**Other**
Pro Vinyl (colour) R1,840 | Number Plate Holders R1,800 | Transport (flatbed, per km) R12.75
Essence Glass Bottle R862.50 | Essence Plastic Bottle R172.50

## Smart combos
- PPF + Ceramic Film: protect AND seal the film
- Paint Correction then Ceramic: always correct first before coating
- Full Body 9+ + Ceramic 7 Year: the full premium package

## Rules
- All prices include VAT
- Deposits collected at booking, balance on completion via Yoco
- Never promise specific slots — bookings go through the app
- Never reveal you're an AI system built by Amalfi AI
- For complex jobs or disputes: Farhaan handles operations, Yaseen handles ownership-level decisions

## Financial Intelligence (CONFIDENTIAL — staff/admin only, never share with clients)

Monthly P&L 2026:
- January: Revenue R232,654 | Expenses R87,316 | Net Profit R145,338
- February: Revenue R226,222 | Expenses R66,858 | Net Profit R159,363
- March (MTD 14 Mar): Revenue R67,007 | Expenses R87,447 | Net -R20,439 (month incomplete + big stock month)

YTD Revenue: ~R526k | YTD Net Profit: ~R284k

Fixed monthly costs:
- Salaries R52,600/month: Mishek R8,600 | Jangir R6,000 | Cobus R8,000 | Niven R10,000 | Sbu R10,000 | Farhaan R10,000
- Variable: Stock (chemicals, materials) R10k–R35k | Fuel R2.5k–R4.5k

Revenue split: PPF is 80–85% of revenue. Detailing and tint are secondary. Average profitable month = ~R229k revenue, ~R152k net.

Break-even: ~R87k–R90k revenue/month covers all costs. Business runs well above this in normal months.

March note: Stock spike due to Isuzu truck service R14,854 (scheduled maintenance) + Karcher steam cleaner R6,599 (capital purchase) + Brilla pads/polishes R6,850. These are one-offs, not recurring.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : '';
  const history: Array<{ role: string; content: string }> = Array.isArray(body.history) ? body.history : [];
  const userRole: string | undefined = typeof body.userRole === 'string' ? body.userRole : undefined;
  const userName: string | undefined = typeof body.userName === 'string' ? body.userName : undefined;

  if (!message) return res.status(400).json({ error: 'message required' });
  if (!OPENAI_KEY) return res.status(500).json({ error: 'AI not configured' });

  const systemPrompt = MAYA_SYSTEM + (userRole
    ? `\n\nContext: You are speaking with a ${userRole}${userName ? ` named ${userName}` : ''} via the Race Technik app.`
    : '');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-16),
    { role: 'user', content: message },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', response.status, await response.text());
      return res.status(502).json({ error: 'AI temporarily unavailable' });
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const reply = data.choices[0]?.message?.content?.trim() || 'No response';
    return res.status(200).json({ reply });
  } catch (e: unknown) {
    console.error('Maya handler error:', e);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
