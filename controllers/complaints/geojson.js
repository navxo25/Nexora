import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const { ward, status } = req.query;

  try {
    // 1. Resolve the city
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // 2. Build the query with the city filter
    let query = supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('city_id', city.id); // <-- Secures map data to the active city

    if (ward) query = query.eq('ward', ward);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    const features = data.map(complaint => ({
      type: 'Feature',
      id: complaint.id,
      geometry: {
        type: 'Point',
        coordinates: [complaint.longitude, complaint.latitude]
      },
      properties: {
        id: complaint.id,
        title: complaint.title,
        category: complaint.category,
        status: complaint.status,
        severity: complaint.severity,
        ward: complaint.ward,
        created_at: complaint.created_at
      }
    }));

    res.status(200).json({ type: 'FeatureCollection', features, count: features.length });
  } catch (error) {
    console.error('Error generating GeoJSON:', error);
    res.status(500).json({ error: 'Failed to generate GeoJSON' });
  }
}
