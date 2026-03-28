const https = require('https');

const LANGUAGE_INSTRUCTIONS = {
  Hinglish: 'Write in Hinglish (natural mix of Hindi and English, like "bhai payment kar do", "please check kar lo"). Use Devanagari words phonetically in English script.',
  English: 'Write in clear, professional Indian English.',
  Hindi: 'Write entirely in Hindi using English script (Hinglish romanization). Example: "Aapka bhugtaan abhi bhi baaki hai."',
  Marathi: 'Write entirely in Marathi using English script. Example: "Aapli payment abhi baaki ahe."',
  Tamil: 'Write entirely in Tamil using English script. Example: "Ungal payment innuma varavillai."',
};

const generateReminderMessage = ({ customerName, businessName, invoiceNumber, amount, daysOverdue, decision, language = 'Hinglish' }) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return reject(new Error('GEMINI_API_KEY not set'));

    const tone = decision === 'ESCALATE'
      ? 'firm and urgent — the customer is significantly late, emphasize urgency without being rude'
      : 'friendly and warm — this is a gentle reminder';

    const overdueText = daysOverdue > 0
      ? `The invoice is ${daysOverdue} days overdue.`
      : 'The invoice is due soon.';

    const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['Hinglish'];

    const prompt = `You are a WhatsApp message writer for a small Indian business owner.
Write a short reminder message for the following situation:

Customer: ${customerName} (${businessName || customerName})
Invoice #: ${invoiceNumber}
Amount due: ₹${amount.toLocaleString('en-IN')}
${overdueText}
Tone: ${tone}
Language: ${langInstruction}

Rules:
- Keep it under 5 lines, conversational
- Include the invoice number and amount
- Use at most 1 emoji
- End with a short polite closing
- Output ONLY the message, no explanation`;

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.75, maxOutputTokens: 220 },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error('Empty response from Gemini'));
          resolve(text.trim());
        } catch {
          reject(new Error('Failed to parse Gemini response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

module.exports = { generateReminderMessage };
