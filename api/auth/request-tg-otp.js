import { supabaseAdmin } from '../../lib/supabase.js';
import { resolveCity } from '../../lib/city.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tg_chat_id } = req.body;
  if (!tg_chat_id) return res.status(400).json({ error: 'tg_chat_id required' });

  try {
    // 1. Resolve city to validate the request source
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60000).toISOString(); // 5 mins

    // 3. Upsert OTP record
    const { error } = await supabaseAdmin
      .from('auth_otps')
      .upsert({ 
        tg_chat_id, 
        otp, 
        expires_at 
      }, { onConflict: 'tg_chat_id' });

    if (error) throw error;

    // Note: In production, you'd trigger your Telegram Bot here to send the code
    return res.status(200).json({ 
      message: 'OTP generated', 
      expires_at,
      city: city.slug 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
