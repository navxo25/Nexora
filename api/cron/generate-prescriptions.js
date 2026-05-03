export const maxDuration = 60; // ← Add this at the top!

import { supabaseAdmin } from '../../lib/supabase.js';
import { askGemini } from '../../lib/gemini.js';

export default async function handler(req, res) {
  // Vercel passes a secret header for cron auth
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)
    return res.status(401).end();

  const { data: cities } = await supabaseAdmin.from('cities').select('id,slug,name').eq('active', true);
  let processed = 0;

  for (const city of cities) {
    // Get unique wards that had complaints in last 30 days
    const { data: wards } = await supabaseAdmin
      .from('complaints')
      .select('ward')
      .eq('city_id', city.id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .not('ward', 'is', null);

    const uniqueWards = [...new Set(wards?.map(r => r.ward) || [])];

    for (const ward of uniqueWards) {
      const { data: complaints } = await supabaseAdmin
        .from('complaints')
        .select('category,severity,status,description_en,created_at')
        .eq('city_id', city.id)
        .eq('ward', ward)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(50); // keep prompt small

      const open   = complaints.filter(c => !['resolved','closed'].includes(c.status)).length;
      const total  = complaints.length;
      const cats   = complaints.map(c => c.category);
      const topCats = [...cats.reduce((m, c) => m.set(c, (m.get(c)||0)+1), new Map())].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);

      const prompt = `
You are an urban planning AI for ${city.name}. Analyse these civic complaints from ${ward} ward over the last 30 days.

Complaints (${total} total, ${open} still open):
${complaints.slice(0,20).map(c => `- [${c.severity}/5] ${c.category}: ${c.description_en || c.category}`).join('\n')}

Respond with ONLY valid JSON (no markdown), this exact shape:
{
  "health_score": ,
  "summary": "<2 sentences describing the main problems>",
  "prescription": "<1-2 sentences of specific recommended action for local government>"
}
`;

      try {
        const raw  = await askGemini(prompt, 300);
        const json = JSON.parse(raw.replace(/```json|```/g, '').trim());

        await supabaseAdmin.from('ward_prescriptions').insert({
          city_id: city.id, ward,
          health_score:   json.health_score,
          summary:        json.summary,
          prescription:   json.prescription,
          top_categories: topCats,
          complaint_count: total,
          open_count:      open
        });
        processed++;
      } catch (e) { console.error(`Prescription failed for ${ward}:`, e.message); }
    }
  }

  res.status(200).json({ message: 'Prescriptions generated', processed });
}
