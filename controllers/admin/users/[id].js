import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: user, error: authError } = await requireAuth(req);
  if (authError) return res.status(401).json({ error: 'Unauthorized' });

  const { data: requester } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).single();

  if (requester?.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can modify users' });
  }

  const { id } = req.query;
  // Only allow changing role, ward_assignment, or is_active
  const { role, ward_assignment, is_active } = req.body;

  // Build update object from only what was provided
  const updates = {};
  if (role !== undefined) updates.role = role;
  if (ward_assignment !== undefined) updates.ward_assignment = ward_assignment;
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ message: 'User updated', user: data });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}
