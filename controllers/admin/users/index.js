import { resolveCity } from '../../../lib/city.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Resolve the city
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // 2. Fetch users for this city
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('city_id', city.id)
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
