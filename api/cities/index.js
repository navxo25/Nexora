import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabaseAdmin
    .from('cities')
    .select('id, slug, name, country, timezone, default_lang, bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng')
    .eq('active', true)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}
