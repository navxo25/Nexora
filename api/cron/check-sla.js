import { supabaseAdmin } from '../../lib/supabase.js';

// Vercel calls this file on the schedule defined in vercel.json.
// It should only be triggered by Vercel (CRON_SECRET protects it from strangers).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protect the cron endpoint — only Vercel should trigger it
  const secret = req.headers['authorization'];
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Find all open complaints created more than 72 hours ago
    // that are not yet marked overdue
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .update({ overdue: true })
      .not('status', 'in', '("resolved","closed")')
      .lt('created_at', cutoff)
      .eq('overdue', false)  // only update ones not already flagged
      .select('id');

    if (error) {
      console.error('SLA update error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`SLA check: marked ${data?.length ?? 0} complaints as overdue`);
    res.status(200).json({
      message: 'SLA check complete',
      marked_overdue: data?.length ?? 0
    });
  } catch (err) {
    console.error('SLA cron error:', err);
    res.status(500).json({ error: 'SLA check failed' });
  }
}
