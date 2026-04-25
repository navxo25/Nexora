import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only admins and moderators can access admin endpoints
  const { data: user, error: authError } = await requireAuth(req);
  if (authError) return res.status(401).json({ error: 'Unauthorized' });

  const { data: userProfile } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).single();

  if (!['admin', 'moderator'].includes(userProfile?.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // ward query param defaults to "all" (aggregate across every ward)
  const ward = req.query.ward || 'all';

  try {
    const { data, error } = await supabaseAdmin.rpc('get_ward_stats', {
      target_ward: ward
    });

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({
      ward,
      stats: data
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
