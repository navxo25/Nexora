import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .select('*, complaint_contractors(id,complaint_id,assigned_at,completed_at,resolution_hours,proof_url)')
      .eq('id', id)
      .single();
    if (!data || error) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ data });
  }

  // PATCH /api/contractors/:id/complete — mark a job done and recompute score
  if (req.method === 'PATCH') {
    const { data: user, error: authErr } = await requireAuth(req);
    if (authErr) return res.status(401).json({ error: 'Unauthorized' });

    const { complaint_contractor_id, proof_url, notes } = req.body;
    if (!complaint_contractor_id)
      return res.status(400).json({ error: 'complaint_contractor_id required' });

    // Get the record to compute hours
    const { data: cc } = await supabaseAdmin
      .from('complaint_contractors')
      .select('assigned_at, contractor_id')
      .eq('id', complaint_contractor_id)
      .single();

    if (!cc) return res.status(404).json({ error: 'Assignment not found' });

    const hours = (Date.now() - new Date(cc.assigned_at)) / 3600000;

    await supabaseAdmin
      .from('complaint_contractors')
      .update({ completed_at: new Date(), resolution_hours: hours, proof_url, notes })
      .eq('id', complaint_contractor_id);

    // Recompute score via SQL function
    await supabaseAdmin.rpc('recompute_contractor_score', { cid: cc.contractor_id });

    return res.status(200).json({ message: 'Job marked complete, score updated' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
