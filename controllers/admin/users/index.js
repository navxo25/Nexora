import { resolveCity } from '../../../lib/city.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  // 1. Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Resolve the city context
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // 3. Fetch users restricted to this city
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('city_id', city.id) // <-- Security: Users from other cities are invisible
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      city: city.name,
      users: data
    });
  } catch (error) {
    console.error('User List Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
