import { runWeeklyScoring } from '../../lib/wardScoring.js';

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`)
    return res.status(401).json({ error: 'Unauthorized' });

  try {
    await runWeeklyScoring();
    res.status(200).json({ message: 'Ward scoring complete' });
  } catch (err) {
    console.error('Ward scoring cron error:', err);
    res.status(500).json({ error: err.message });
  }
}
