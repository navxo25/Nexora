import { supabaseAdmin } from '../../lib/supabase.js';

const ORS_URL = 'https://api.openrouteservice.org/v2/isochrones';

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const {
    lat,
    lng,
    profile = 'foot-walking',
    range_minutes = [5, 10, 15]
  } = req.body;

  if (!lat || !lng)
    return res.status(400).json({ error: 'lat and lng required' });

  // Round to ~11m precision for cache key
  const cacheKey = `${parseFloat(lat).toFixed(4)}:${parseFloat(lng).toFixed(4)}:${profile}:${range_minutes.join(',')}`;

  // Check Supabase cache first
  const { data: cached } = await supabaseAdmin
    .from('isochrone_cache')
    .select('geojson, created_at')
    .eq('cache_key', cacheKey)
    .single();

  if (cached) {
    const age = (Date.now() - new Date(cached.created_at)) / 1000;
    if (age < 86400) { // 24 hours
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.geojson);
    }
  }

  // Fetch from OpenRouteService
  const orsResp = await fetch(`${ORS_URL}/${profile}`, {
    method: 'POST',
    headers: {
      'Authorization': process.env.ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      locations: [[parseFloat(lng), parseFloat(lat)]],
      range: range_minutes.map(m => m * 60),
      range_type: 'time',
      attributes: ['area'],
      smoothing: 0.25
    })
  });

  if (!orsResp.ok) {
    const err = await orsResp.text();
    return res.status(502).json({ error: `ORS error: ${err}` });
  }

  const geojson = await orsResp.json();

  // Store in cache (upsert)
  await supabaseAdmin
    .from('isochrone_cache')
    .upsert({ cache_key: cacheKey, geojson, created_at: new Date() });

  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(geojson);
}
