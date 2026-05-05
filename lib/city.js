import { supabaseAdmin } from './supabase.js';

// Call at the top of any API route that needs city context
export async function resolveCity(req) {
  const slug = req.query.city || req.headers['x-city'] || 'mumbai';

  const { data, error } = await supabaseAdmin
    .from('cities')
    .select('id, slug, name, timezone, default_lang, bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng')
    .eq('slug', slug.toLowerCase())
    .eq('active', true)
    .single();

  if (error || !data) return { city: null, error: `Unknown city: ${slug}` };
  return { city: data, error: null };
}
