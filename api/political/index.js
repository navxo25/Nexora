import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // 1. Resolve the city context
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  // Handle GET: Fetch politicians for this city
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('politicians')
      .select('*')
      .eq('city_id', city.id)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // Handle POST: Add a new politician to this city
  if (req.method === 'POST') {
    const { data, error } = await supabaseAdmin
      .from('politicians')
      .insert({ 
        ...req.body, 
        city_id: city.id // <-- Connects record to city
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
