import { supabaseAdmin } from '../lib/supabase.js';
import { resolveCity } from '../lib/city.js';

// Simple in-memory rate limiter (resets on Vercel cold start)
const rateLimits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, reset: now + 3600000 };
  
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 3600000;
  }
  
  entry.count++;
  rateLimits.set(ip, entry);
  return entry.count > 100; // Limit: 100 requests per hour per IP
}

export default async function handler(req, res) {
  // Only allow GET requests for the public data API
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  // 1. Check Rate Limit
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded: 100 requests per hour' });
  }

  // 2. Resolve the City Context
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  try {
    // 3. Handle CSV Export Logic (?format=csv)
    if (req.query.format === 'csv') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('id, category, severity, status, ward, address, created_at, updated_at')
        .eq('city_id', city.id)
        .is('deleted_at', null)
        .limit(10000);

      if (error) throw error;

      const headers = ['id', 'category', 'severity', 'status', 'ward', 'address', 'created_at', 'updated_at'];
      const csv = [
        headers.join(','),
        ...data.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="nexora-${city.slug}-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csv);
    }

    // 4. Handle Standard JSON Response
    const { ward, status, category, limit = '500' } = req.query;
    const safeLimit = Math.min(parseInt(limit), 1000);

    let query = supabaseAdmin
      .from('complaints')
      .select('id, category, severity, status, ward, created_at, updated_at')
      .eq('city_id', city.id)
      .is('deleted_at', null)
      .limit(safeLimit)
      .order('created_at', { ascending: false });

    if (ward) query = query.eq('ward', ward);
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;

    if (error) throw error;

    // Cache the JSON response for 1 hour to reduce Supabase/Vercel load
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json({
      city: city.slug,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Public API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch public data' });
  }
}
