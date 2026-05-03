import { supabaseAdmin } from '../../lib/supabase.js';
import { resolveCity } from '../../lib/city.js';

export default async function handler(req, res) {
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  const { ward } = req.query;

  let query = supabaseAdmin
    .from('ward_prescriptions')
    .select('ward, health_score, summary, prescription, top_categories, complaint_count, open_count, generated_at')
    .eq('city_id', city.id)
    .order('generated_at', { ascending: false });

  if (ward) query = query.eq('ward', ward);

  // Get only the most recent prescription per ward
  query = query.limit(1);
  if (!ward) query = supabaseAdmin.from('ward_prescriptions')
    .select('*').eq('city_id', city.id)
    .order('health_score', { ascending: true }); // worst wards first

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data, city: city.slug });
}
