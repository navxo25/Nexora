import { resolveCity } from '../../../lib/city.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query; // This is the user UUID from the URL

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // 1. Resolve the city context
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // Handle GET: Fetch a specific user's details
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, phone, created_at, city_id')
        .eq('id', id)
        .eq('city_id', city.id) // <-- Security: Prevents viewing users from other cities
        .single();

      if (error || !data) return res.status(404).json({ error: 'User not found in this city' });
      return res.status(200).json(data);
    }

    // Handle PATCH: Update user details (e.g., changing role)
    if (req.method === 'PATCH') {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(req.body)
        .eq('id', id)
        .eq('city_id', city.id) // <-- Security: Prevents modifying users from other cities
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // Handle DELETE: Remove a user from the city registry
    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id)
        .eq('city_id', city.id); // <-- Security: Prevents deleting users from other cities

      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(`Error in admin/users/${id}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
