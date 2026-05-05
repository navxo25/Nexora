import { supabaseAdmin } from '../../lib/supabase.js';
import { findLatestSentinel2 } from '../../lib/satellite.js';

// Mumbai ward bounding boxes — extend as needed
const WARD_BBOXES = {
  'Dharavi':  [72.845, 19.037, 72.865, 19.048],
  'Bandra':   [72.822, 19.052, 72.838, 19.067],
  'Andheri':  [72.858, 19.108, 72.882, 19.122],
  'Kurla':    [72.879, 19.068, 72.899, 19.082],
  'Borivali': [72.847, 19.223, 72.870, 19.237]
};

export default async function handler(req, res) {

  // GET /api/satellite?ward=Dharavi — latest snapshot for a ward
  if (req.method === 'GET') {
    const { ward } = req.query;
    if (!ward) return res.status(400).json({ error: 'ward required' });

    const { data } = await supabaseAdmin
      .from('satellite_snapshots')
      .select('*')
      .eq('ward', ward)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    return res.status(200).json({ data });
  }

  // POST /api/satellite/fetch — admin triggers a fresh fetch for a ward
  if (req.method === 'POST') {
    const { ward } = req.body;
    const bbox = WARD_BBOXES[ward];
    if (!bbox) return res.status(400).json({ error: `Unknown ward: ${ward}` });

    const snap = await findLatestSentinel2(bbox);
    if (!snap) return res.status(404).json({ error: 'No cloud-free tile found in last 30 days' });

    const { data, error } = await supabaseAdmin
      .from('satellite_snapshots')
      .insert({ ward, ...snap })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
