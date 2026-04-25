import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: user, error: authError } = await requireAuth(req);
  if (authError) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { new_status, reason } = req.body;

  if (!new_status) {
    return res.status(400).json({ error: 'Status required' });
  }

  try {
    // Check authorization
    const { data: userRole } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['agent', 'moderator', 'admin'].includes(userRole.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get old status
    const { data: complaint } = await supabaseAdmin
      .from('complaints')
      .select('status')
      .eq('id', id)
      .single();

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Update complaint
    const { error } = await supabaseAdmin
      .from('complaints')
      .update({ 
        status: new_status, 
        updated_at: new Date().toISOString(),
        resolved_at: new_status === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) return res.status(400).json({ error: error.message });

    // Log to history
    await supabaseAdmin.from('complaint_status_history').insert({
      complaint_id: id,
      changed_by: user.id,
      old_status: complaint.status,
      new_status,
      reason: reason || ''
    });

    res.status(200).json({ 
      message: 'Status updated successfully',
      complaint: { id, status: new_status }
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
}
