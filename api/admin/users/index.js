import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: user, error: authError } = await requireAuth(req);
  if (authError) return res.status(401).json({ error: 'Unauthorized' });

  const { data: requester } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).single();

  if (!['admin', 'moderator'].includes(requester?.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { role, ward } = req.query;

  try {
    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, ward_assignment, is_active, created_at')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (ward) query = query.eq('ward_assignment', ward);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ data, count: data.length });
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
