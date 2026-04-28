import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export default async function handler(req, res) {

  // ── GET — public list of contractors ────────────────────────────
  if (req.method === 'GET') {
    const { ward, min_score = 0 } = req.query;
    let query = supabaseAdmin
      .from('contractors')
      .select('id,name,ward,categories,integrity_score,total_jobs,resolved_jobs,avg_resolution_hours,sla_breach_count')
      .gte('integrity_score', parseFloat(min_score))
      .order('integrity_score', { ascending: false });

    if (ward) query = query.eq('ward', ward);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data, count: data.length });
  }

  // ── POST — create contractor (admin only) ────────────────────────
  if (req.method === 'POST') {
    const { data: user, error: authErr } = await requireAuth(req);
    if (authErr) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabaseAdmin
      .from('users').select('role').eq('id', user.id).single();
    if (!['admin','moderator'].includes(profile?.role))
      return res.status(403).json({ error: 'Admin access required' });

    const { name, registration_no, ward, categories = [], contact_email } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { data, error } = await supabaseAdmin
      .from('contractors')
      .insert({ name, registration_no, ward, categories, contact_email })
      .select('id,name,integrity_score')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
