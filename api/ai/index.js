import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const { type, ward, priority } = req.query;

  // /api/ai?type=scores — latest score per ward
  if (type === 'scores') {
    const { data } = await supabaseAdmin
      .from('ward_scores')
      .select('ward, score, open_count, resolved_count, sla_breach_pct, computed_at')
      .order('computed_at', { ascending: false })
      .limit(500);

    // Keep only latest per ward
    const latest = Object.values(
      data.reduce((acc, row) => {
        if (!acc[row.ward]) acc[row.ward] = row;
        return acc;
      }, {})
    );
    return res.status(200).json({ data: latest });
  }

  // /api/ai?type=prescriptions&ward=Dharavi
  if (type === 'prescriptions') {
    let query = supabaseAdmin
      .from('prescriptions')
      .select('ward, summary, priority, root_causes, actions, created_at')
      .order('created_at', { ascending: false });

    if (ward) query = query.eq('ward', ward).limit(1);
    else {
      if (priority) query = query.gte('priority', parseInt(priority));
      query = query.limit(200);
    }

    const { data } = await query;
    return res.status(200).json({ data });
  }

  res.status(400).json({ error: 'type param required: scores or prescriptions' });
}
