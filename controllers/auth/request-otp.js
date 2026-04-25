import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Basic check — make sure email was provided
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // This tells Supabase to send a 6-digit OTP to the email.
    // Supabase handles generation, storage, and email delivery.
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Never confirm whether the email exists — security best practice
    res.status(200).json({ message: 'OTP sent if account exists' });
  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}
