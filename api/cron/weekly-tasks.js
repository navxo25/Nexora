import { runWeeklyScoring } from '../../lib/wardScoring.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // 1. Verify Vercel Cron Secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Run the AI Ward Scoring (Playbook Step 6)
    await runWeeklyScoring();

    // 3. Refresh the Materialized View (Playbook Step 3)
    await supabaseAdmin.rpc('refresh_politician_stats');

    res.status(200).json({ message: 'Weekly ward scoring and matview refresh complete' });
  } catch (err) {
    console.error('Weekly tasks cron error:', err);
    res.status(500).json({ error: err.message });
  }
}
