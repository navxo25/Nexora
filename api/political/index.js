import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export default async function handler(req, res) {

  // GET /api/political — all scorecards (public)
  if (req.method === 'GET') {
    const { ward } = req.query;
    let query = supabaseAdmin
      .from('politician_stats')
      .select('*')
      .order('resolution_pct', { ascending: false, nullsLast: true });

    if (ward) query = query.eq('ward', ward);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  }

  // POST /api/political/refresh — admin only, refreshes the matview
  if (req.method === 'POST') {
    const { data: user, error: authErr } = await requireAuth(req);
    if (authErr) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabaseAdmin
      .from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin')
      return res.status(403).json({ error: 'Admin only' });

    await supabaseAdmin.rpc('refresh_politician_stats');
    return res.status(200).json({ message: 'Politician stats refreshed' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
