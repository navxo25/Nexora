import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;  // Vercel injects this from the URL

  // ── GET single complaint ───────────────────────────────────────
  if (req.method === 'GET') {
    try {
      // Fetch the complaint itself
      const { data: complaint, error } = await supabaseAdmin
        .from('complaints')
        .select(`
          *,
          users ( id, full_name, email ),
          complaint_status_history (
            id, old_status, new_status, reason, created_at,
            users ( full_name )
          )
        `)
        .eq('id', id)
        .single();

      if (error || !complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }

      return res.status(200).json({ data: complaint });
    } catch (err) {
      console.error('Error fetching complaint:', err);
      return res.status(500).json({ error: 'Failed to fetch complaint' });
    }
  }

  // ── DELETE complaint (owner or admin only) ─────────────────────
  if (req.method === 'DELETE') {
    const { data: user, error: authError } = await requireAuth(req);
    if (authError) return res.status(401).json({ error: 'Unauthorized' });

    try {
      // First check the complaint exists and who owns it
      const { data: complaint } = await supabaseAdmin
        .from('complaints')
        .select('user_id, status')
        .eq('id', id)
        .single();

      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }

      // Get requester role
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      // Only the owner OR an admin can delete
      const isOwner = complaint.user_id === user.id;
      const isAdmin = ['admin', 'moderator'].includes(userProfile.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Cannot delete this complaint' });
      }

      const { error: delError } = await supabaseAdmin
        .from('complaints')
        .delete()
        .eq('id', id);

      if (delError) return res.status(400).json({ error: delError.message });

      return res.status(200).json({ message: 'Complaint deleted' });
    } catch (err) {
      console.error('Error deleting complaint:', err);
      return res.status(500).json({ error: 'Failed to delete complaint' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
