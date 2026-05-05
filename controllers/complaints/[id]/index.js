import { resolveCity } from '../../../lib/city.js'; 
import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  // 1. Resolve the city
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  try {
    // GET: Fetch specific complaint details
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('*')
        .eq('id', id)
        .eq('city_id', city.id) // <-- Security: Ensures ID belongs to the active city
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // PATCH: Update complaint (e.g., status change)
    if (req.method === 'PATCH') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .update(req.body)
        .eq('id', id)
        .eq('city_id', city.id) // <-- Security: Prevents updating cross-city data
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // DELETE: Remove a complaint
    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin
        .from('complaints')
        .delete()
        .eq('id', id)
        .eq('city_id', city.id); // <-- Security: Prevents cross-city deletion

      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(`Error in complaints/${id}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
