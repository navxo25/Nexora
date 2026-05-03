import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Superadmin only
  const { data: user, error: authErr } = await requireAuth(req);
  if (authErr) return res.status(401).json({ error: 'Unauthorized' });
  const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Superadmin only' });

  const { name, country, slug, timezone, default_lang, wards = [], bbox } = req.body;
  if (!name || !country || !slug) return res.status(400).json({ error: 'name, country, slug required' });

  // 1. Create city record
  const { data: city, error: cityErr } = await supabaseAdmin
    .from('cities')
    .insert({
      slug: slug.toLowerCase(),
      name, country, timezone: timezone || 'UTC',
      default_lang: default_lang || 'en',
      ...(bbox && { bbox_sw_lat: bbox.sw_lat, bbox_sw_lng: bbox.sw_lng, bbox_ne_lat: bbox.ne_lat, bbox_ne_lng: bbox.ne_lng })
    })
    .select().single();

  if (cityErr) return res.status(400).json({ error: cityErr.message });

  // 2. Seed ward list (optional)
  if (wards.length > 0) {
    const wardRows = wards.map(w => ({ city_id: city.id, name: w }));
    await supabaseAdmin.from('city_wards').insert(wardRows);
  }

  return res.status(201).json({
    message: `City ${name} is live at ?city=${slug}`,
    city_id: city.id,
    slug: city.slug
  });
}
