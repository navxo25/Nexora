export const maxDuration = 60; // Forces Vercel free tier to max timeout limit
import { supabaseAdmin } from '../lib/supabase.js';
import { askGemini } from '../lib/gemini.js';

// Helper for Computer Vision
async function urlToBase64(url) {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

export default async function handler(req, res) {
  // 1. Verify Vercel Cron Secret
  const secret = req.headers['authorization'] || req.headers['Authorization'];
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { task } = req.query;

  try {
    // Get all active cities to process
    const { data: cities } = await supabaseAdmin
      .from('cities')
      .select('id, slug, name')
      .eq('active', true);

    // =======================================================================
    // TASK 1: COMPUTER VISION (?task=cv)
    // =======================================================================
    if (task === 'cv') {
      let processed = 0;
      for (const city of cities) {
        const { data: complaints } = await supabaseAdmin
          .from('complaints')
          .select('id, photo_urls')
          .eq('city_id', city.id)
          .is('cv_processed_at', null)
          .not('photo_urls', 'eq', '[]')
          .limit(10); // Process small batches to avoid timeout

        for (const c of complaints) {
          try {
            const prompt = `Classify this urban issue. Respond ONLY with JSON: {"label": "pothole|garbage|etc", "confidence": 0.9}`;
            const photoUrl = c.photo_urls[0];
            
            // Call Gemini Vision via your lib/gemini.js helper
            const response = await askGemini(prompt, photoUrl); 
            const result = JSON.parse(response);

            await supabaseAdmin.from('complaints').update({
              cv_label: result.label,
              cv_confidence: result.confidence,
              cv_processed_at: new Date()
            }).eq('id', c.id);
            processed++;
          } catch (e) { console.error(`CV Error on ${c.id}:`, e.message); }
        }
      }
      return res.status(200).json({ message: 'CV analysis complete', processed });
    }

    // =======================================================================
    // TASK 2: AI PRESCRIPTIONS (?task=prescriptions)
    // =======================================================================
    if (task === 'prescriptions') {
      let wardCount = 0;
      for (const city of cities) {
        // Fetch complaints from last 30 days to generate a health report
        const { data: complaints } = await supabaseAdmin
          .from('complaints')
          .select('ward, category, severity, description_en')
          .eq('city_id', city.id)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

        const uniqueWards = [...new Set(complaints.map(c => c.ward))];

        for (const ward of uniqueWards) {
          const wardData = complaints.filter(c => c.ward === ward);
          const prompt = `As an urban planner for ${city.name}, summarize these ${wardData.length} complaints in ${ward} and give a 1-sentence fix. JSON ONLY: {"summary": "...", "prescription": "..."}`;
          
          try {
            const aiResult = await askGemini(prompt);
            const json = JSON.parse(aiResult);

            await supabaseAdmin.from('ward_prescriptions').insert({
              city_id: city.id,
              ward,
              summary: json.summary,
              prescription: json.prescription,
              generated_at: new Date()
            });
            wardCount++;
          } catch (e) { console.error(`Prescription Error ${ward}:`, e.message); }
        }
      }
      return res.status(200).json({ message: 'Prescriptions generated', wardCount });
    }

    return res.status(400).json({ error: 'Valid task required' });

  } catch (error) {
    console.error('Cron Global Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
