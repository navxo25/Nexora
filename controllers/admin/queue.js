import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Resolve the city context
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // 2. Fetch the work queue for this city
    const { data, error } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('city_id', city.id)
      .in('status', ['open', 'in-progress'])
      .order('severity', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      city: city.slug,
      queue_count: data.length,
      items: data
    });
  } catch (error) {
    console.error('Queue Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
