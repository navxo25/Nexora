import { supabaseAdmin } from '../lib/supabase.js';
import { resolveCity } from '../lib/city.js';

// Simple in-memory rate limiter (resets on cold start)
const rateLimits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  entry.count++;
  rateLimits.set(ip, entry);
  return entry.count > 100; // 100 req/hour per IP
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // 1. Check Rate Limit
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Rate limit: 100 requests/hour' });

  // 2. Resolve the City
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  // =======================================================================
  // CSV EXPORT LOGIC (Triggered by ?format=csv)
  // =======================================================================
  if (req.query.format === 'csv') {
    const { data } = await supabaseAdmin
      .from('complaints')
      .select('id, category, severity, status, ward, address, created_at, updated_at')
      .eq('city_id', city.id)
      .is('deleted_at', null)
      .limit(10000);

    const headers = ['id', 'category', 'severity', 'status', 'ward', 'address', 'created_at', 'updated_at'];
    const csv = [
      headers.join(','),
      ...data.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nexora-${city.slug}-${new Date().toISOString().slice(0,10)}.csv"`);
    return res.status(200).send(csv);
  }

  // =======================================================================
  // WARD PRESCRIPTIONS LOGIC (Triggered by ?type=prescriptions)
  // =======================================================================
  if (req.query.type === 'prescriptions') {
    const { ward } = req.query;
    let query = supabaseAdmin
      .from('ward_prescriptions')
      .select('ward, health_score, summary, prescription, top_categories, complaint_count, open_count, generated_at')
      .eq('city_id', city.id)
      .order('generated_at', { ascending: false });

    if (ward) {
      query = query.eq('ward', ward).limit(1);
    } else {
      query = supabaseAdmin.from('ward_prescriptions').select('*').eq('city_id', city.id).order('health_score', { ascending: true });
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data, city: city.slug });
  }

  // =======================================================================
  // STANDARD JSON LOGIC (Default behavior)
  // =======================================================================
  const { ward, status, category, from, to, limit = '500' } = req.query;
  const safeLimit = Math.min(parseInt(limit), 1000);

  let query = supabaseAdmin
    .from('complaints')
    .select('id, category, severity, status, ward, created_at, updated_at') // no PII
    .eq('city_id', city.id)
    .is('deleted_at', null)
    .limit(safeLimit)
    .order('created_at', { ascending: false });

  if (ward)     query = query.eq('ward', ward);
  if (status)   query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  if (from)     query = query.gte('created_at', from);
  if (to)       query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1hr
  return res.status(200).json({ city: city.slug, count: data.length, data });
}
