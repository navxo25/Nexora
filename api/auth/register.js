import { supabaseAdmin } from '../../lib/supabase.js';
import { validateEmail, validatePassword } from '../../lib/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, full_name, phone } = req.body;

  // Validate input
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters' 
    });
  }

  try {
    // Create auth user in Supabase Auth
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user.id,
        email,
        full_name: full_name || '',
        phone: phone || '',
        role: 'citizen',
        is_active: true
      });

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return res.status(400).json({ error: profileError.message });
    }

    res.status(201).json({ 
      user: {
        id: data.user.id,
        email,
        full_name: full_name || '',
        role: 'citizen'
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}
