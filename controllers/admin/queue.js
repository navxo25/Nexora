import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: user, error: authError } = await requireAuth(req);
  if (authError) return res.status(401).json({ error: 'Unauthorized' });

  const { data: userProfile } = await supabaseAdmin
    .from('users').select('role, ward_assignment').eq('id', user.id).single();

  if (!['agent', 'moderator', 'admin'].includes(userProfile?.role)) {
    return res.status(403).json({ error: 'Agent access required' });
  }

  // Agents only see their own ward; admins/mods see everything
  const wardFilter = req.query.ward ||
    (userProfile.role === 'agent' ? userProfile.ward_assignment : null);

  try {
    let query = supabaseAdmin
      .from('complaints')
      .select('id, title, category, severity, status, ward, created_at, overdue, users(full_name, email)')
      .not('status', 'in', '("resolved","closed")')
      .order('overdue', { ascending: false })    // overdue first
      .order('severity', { ascending: false })   // high severity next
      .order('created_at', { ascending: true })  // oldest first
      .limit(100);

    if (wardFilter) query = query.eq('ward', wardFilter);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ data, count: data.length });
  } catch (err) {
    console.error('Queue error:', err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
}
