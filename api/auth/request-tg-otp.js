import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tg_chat_id } = req.body;
  if (!tg_chat_id) return res.status(400).json({ error: 'tg_chat_id required' });

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

  // Upsert OTP to DB
  await supabaseAdmin.from('auth_otps').upsert({ tg_chat_id, otp, expires_at });

  // Send via Telegram API (no SDK needed)
  const tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const tgResp = await fetch(tgUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: tg_chat_id,
      text: `Your Nexora Login OTP is: ${otp}\nDo not share this with anyone. Valid for 10 minutes.`
    })
  });

  if (!tgResp.ok) return res.status(500).json({ error: 'Failed to send Telegram message. Is the Chat ID correct?' });

  res.status(200).json({ message: 'OTP sent via Telegram', expires_in: 600 });
}
