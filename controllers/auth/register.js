import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Resolve the city (Defaults to Mumbai if no header/query is present)
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    const { email, name, role = 'citizen', phone } = req.body;

    // 2. Insert into public.users table with city_id
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        name,
        phone,
        role,
        city_id: city.id // <-- Connects the user to their local Nexora instance
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      message: `User registered successfully in ${city.name}`,
      user: data
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
