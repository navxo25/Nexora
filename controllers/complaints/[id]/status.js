import { resolveCity } from '../../../lib/city.js'; 
import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  // Only allow PATCH or PUT for status updates
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support ID coming from either the URL route ([id]) or the request body
  const id = req.query.id || req.body.id;
  const { status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: 'Missing complaint ID or status payload' });
  }

  try {
    // 1. Resolve the city from the request
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // 2. Update the status, safely restricted to the resolved city
    const { data, error } = await supabaseAdmin
      .from('complaints')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('city_id', city.id) // <-- SECURITY: Prevents cross-city status tampering
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);

  } catch (error) {
    console.error(`Error updating complaint status:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
