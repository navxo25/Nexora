// pages/api/admin/ai-stats.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { ward } = req.query;
  let query = supabase.from('complaints').select('ai_priority, ai_category, ai_urgency_score, department, escalated, ai_confidence');
  
  if (ward) query = query.eq('ward', ward);
  const { data } = await query;
  if (!data) return res.json({});

  const validScores = data.filter(c => c.ai_urgency_score).map(c => c.ai_urgency_score);

  const stats = {
    total: data.length,
    by_priority: {
      critical: data.filter(c => c.ai_priority === 'critical').length,
      high:     data.filter(c => c.ai_priority === 'high').length,
      normal:   data.filter(c => c.ai_priority === 'normal').length,
      low:      data.filter(c => c.ai_priority === 'low').length,
    },
    by_department: {},
    escalated: data.filter(c => c.escalated).length,
    avg_confidence: (data.reduce((s, c) => s + (c.ai_confidence || 0), 0) / data.length).toFixed(2),
    avg_urgency: validScores.length ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : 0,
    unclassified: data.filter(c => !c.ai_category).length,
  };

  data.forEach(c => {
    if (c.department) {
      stats.by_department[c.department] = (stats.by_department[c.department] || 0) + 1;
    }
  });

  return res.json(stats);
}
