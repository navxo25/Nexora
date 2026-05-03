import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // 1. Resolve the city for all requests in this file
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  try {
    // GET: Fetch all complaints for the specific city
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('*')
        .eq('city_id', city.id) // <-- Filter by city
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // POST: Create a new complaint tagged to the specific city
    if (req.method === 'POST') {
      const payload = req.body;
      
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .insert({
          ...payload,
          city_id: city.id // <-- Tag the new record with the city ID
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // Reject other methods
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Error in complaints/index:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
