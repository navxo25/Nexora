export const maxDuration = 60; // ← Forces Vercel free tier to max timeout limit

import { supabaseAdmin } from '../lib/supabase.js';
import { askGemini } from '../lib/gemini.js';
import { runWeeklyScoring } from '../lib/wardScoring.js';

export default async function handler(req, res) {
  // 1. Verify Vercel Cron Secret (Blocks unauthorized access)
  const secret = req.headers['authorization'] || req.headers['Authorization'];
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { task } = req.query; // Identifies which cron job Vercel wants to run

  // =======================================================================
  // TASK 1: AI PRESCRIPTIONS (?task=prescriptions)
  // =======================================================================
  if (task === 'prescriptions') {
    const { data: cities } = await supabaseAdmin.from('cities').select('id,slug,name').eq('active', true);
    let processed = 0;

    for (const city of cities) {
      const { data: wards } = await supabaseAdmin
        .from('complaints').select('ward').eq('city_id', city.id)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .not('ward', 'is', null);

      const uniqueWards = [...new Set(wards?.map(r => r.ward) || [])];

      for (const ward of uniqueWards) {
        const { data: complaints } = await supabaseAdmin
          .from('complaints').select('category,severity,status,description_en,created_at')
          .eq('city_id', city.id).eq('ward', ward)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).limit(50);

        const open = complaints.filter(c => !['resolved','closed'].includes(c.status)).length;
        const total = complaints.length;
        const cats = complaints.map(c => c.category);
        const topCats = [...cats.reduce((m, c) => m.set(c, (m.get(c)||0)+1), new Map())].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);

        const prompt = `
You are an urban planning AI for ${city.name}. Analyse these civic complaints from ${ward} ward over the last 30 days.

Complaints (${total} total, ${open} still open):
${complaints.slice(0,20).map(c => `- [${c.severity}/5] ${c.category}: ${c.description_en || c.category}`).join('\n')}

Respond with ONLY valid JSON (no markdown), this exact shape:
{
  "health_score": 0,
  "summary": "<2 sentences describing the main problems>",
  "prescription": "<1-2 sentences of specific recommended action for local government>"
}
`;
        try {
          const raw = await askGemini(prompt, 300);
          const json = JSON.parse(raw.replace(/```json|```/g, '').trim());

          await supabaseAdmin.from('ward_prescriptions').insert({
            city_id: city.id, ward,
            health_score: json.health_score,
            summary: json.summary,
            prescription: json.prescription,
            top_categories: topCats,
            complaint_count: total,
            open_count: open
          });
          processed++;
        } catch (e) { console.error(`Prescription failed for ${ward}:`, e.message); }
      }
    }
    return res.status(200).json({ message: 'Prescriptions generated', processed });
  }

  // =======================================================================
  // TASK 2: WEEKLY WARD SCORING & MATVIEW (?task=weekly)
  // =======================================================================
  if (task === 'weekly') {
    try {
      await runWeeklyScoring();
      await supabaseAdmin.rpc('refresh_politician_stats');
      return res.status(200).json({ message: 'Weekly ward scoring and matview refresh complete' });
    } catch (err) {
      console.error('Weekly tasks cron error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // =======================================================================
  // TASK 3: SLA OVERDUE CHECK (?task=sla)
  // =======================================================================
  if (task === 'sla') {
    try {
      const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .update({ overdue: true })
        .not('status', 'in', '("resolved","closed")')
        .lt('created_at', cutoff)
        .eq('overdue', false) 
        .select('id');

      if (error) {
        console.error('SLA update error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`SLA check: marked ${data?.length ?? 0} complaints as overdue`);
      return res.status(200).json({ message: 'SLA check complete', marked_overdue: data?.length ?? 0 });
    } catch (err) {
      console.error('SLA cron error:', err);
      return res.status(500).json({ error: 'SLA check failed' });
    }
  }

  // If the query parameter is missing or wrong
  return res.status(400).json({ error: 'Unknown or missing task parameter' });
}
// =======================================================================
  // TASK 4: SATELLITE DATA (?task=satellite)
  // =======================================================================
  if (task === 'satellite') {
    const { data: cities } = await supabaseAdmin
      .from('cities')
      .select('id, slug, bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng')
      .eq('active', true);

    for (const city of cities) {
      // Centre of bounding box
      const lat = (city.bbox_sw_lat + city.bbox_ne_lat) / 2;
      const lng = (city.bbox_sw_lng + city.bbox_ne_lng) / 2;

      // Open-Meteo: free, no key, returns last 7 days of weather
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max&past_days=7&forecast_days=0&timezone=auto`;

      try {
        const resp = await fetch(url);
        const data = await resp.json();
        const days = data.daily;

        if (days?.precipitation_sum) {
          const rows = days.time.map((t, i) => ({
            city_id:     city.id,
            obs_type:    'rainfall',
            value:       days.precipitation_sum[i] || 0,
            unit:        'mm',
            source:      'open-meteo',
            observed_at: `${t}T12:00:00Z`
          }));
          await supabaseAdmin.from('satellite_observations').upsert(rows, { onConflict: 'city_id,obs_type,observed_at' });
        }
      } catch (e) { console.error(`Weather fetch failed for ${city.slug}:`, e.message); }
    }

    return res.status(200).json({ message: 'Satellite data refreshed' });
  }

  // If the query parameter is missing or wrong
  return res.status(400).json({ error: 'Unknown or missing task parameter' });
}
