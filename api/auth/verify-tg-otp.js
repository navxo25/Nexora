import { supabaseAdmin } from '../../lib/supabase.js';
import { signToken } from '../../lib/jwt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tg_chat_id, otp } = req.body;
  if (!tg_chat_id || !otp) return res.status(400).json({ error: 'tg_chat_id and otp required' });

  // Verify OTP
  const { data: record } = await supabaseAdmin
    .from('auth_otps')
    .select('*')
    .eq('tg_chat_id', tg_chat_id)
    .single();

  if (!record || record.otp !== otp || new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  // Clear OTP
  await supabaseAdmin.from('auth_otps').delete().eq('tg_chat_id', tg_chat_id);

  // Find or auto-create user
  let { data: user } = await supabaseAdmin
    .from('users').select('*').eq('tg_chat_id', tg_chat_id).single();

  if (!user) {
    const { data: newUser } = await supabaseAdmin
      .from('users')
      .insert({ tg_chat_id, role: 'citizen' })
      .select().single();
    user = newUser;
  }

  const token = signToken({ id: user.id, role: user.role });
  res.status(200).json({ access_token: token, user });
}
