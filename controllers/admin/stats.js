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

    // 2. Fetch stats filtered by city_id
    const { data: stats, error } = await supabaseAdmin
      .from('complaints')
      .select('status, severity')
      .eq('city_id', city.id);

    if (error) throw error;

    // Aggregate data for the frontend
    const summary = {
      total: stats.length,
      open: stats.filter(s => s.status === 'open').length,
      resolved: stats.filter(s => s.status === 'resolved').length,
      critical: stats.filter(s => s.severity >= 4).length,
      city_name: city.name
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Stats Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
