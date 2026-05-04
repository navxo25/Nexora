// pages/api/ai/classify.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a civic grievance classification AI for Indian cities.
Analyze the complaint and return ONLY a valid JSON object with these fields:
{
  "category": one of [roads, water, waste, transport, lighting, safety, encroachment],
  "department": one of [Roads & Infrastructure, Water Supply, Sanitation & Waste, Transport Authority, Electricity & Lighting, Public Safety],
  "priority": one of [low, normal, high, critical],
  "urgency_score": an integer from 1 to 100 (where 100 is an immediate, life-threatening crisis and 1 is a minor cosmetic suggestion),
  "sentiment": one of [neutral, negative, urgent, distressed],
  "summary_en": "1-sentence English summary of the complaint",
  "description_en": "Full English translation if not already in English, else repeat original",
  "detected_lang": "ISO 639-1 language code",
  "confidence": a number between 0.0 and 1.0,
  "keywords": ["array", "of", "key", "issue", "words"]
}
Priority rules:
- critical (score 80-100): mentions injury, death, danger, flooding, fire, collapse
- high (score 60-79): no water/power for >24h, road completely blocked, sewage overflow
- normal (score 30-59): standard infrastructure complaints
- low (score 1-29): suggestions, minor cosmetic issues`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && !req.headers['x-admin']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { complaint_id, description, batch } = req.body;
  const ids = batch || [{ id: complaint_id, description }];
  const results = [];

  for (const item of ids) {
    try {
      const result = await classifyComplaint(item.id, item.description);
      results.push(result);
    } catch (e) {
      results.push({ id: item.id, error: e.message });
    }
  }
  return res.status(200).json({ classified: results });
}

async function classifyComplaint(complaintId, description) {
  const geminiRes = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nCOMPLAINT TEXT:\n"${description}"` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 500, responseMimeType: 'application/json' }
    })
  });

  const geminiData = await geminiRes.json();
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  let classification;
  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    classification = JSON.parse(clean);
  } catch {
    classification = {};
  }

  await supabase.from('complaints').update({
    ai_category:       classification.category,
    ai_confidence:     classification.confidence,
    ai_priority:       classification.priority,
    ai_urgency_score:  classification.urgency_score,
    ai_sentiment:      classification.sentiment,
    ai_summary:        classification.summary_en,
    description_en:    classification.description_en,
    user_lang:         classification.detected_lang,
    department:        classification.department,
    routed_at:         new Date().toISOString(),
    escalated:         classification.priority === 'critical' || classification.urgency_score >= 85,
  }).eq('id', complaintId);

  await supabase.from('ai_classification_log').insert({
    complaint_id:    complaintId,
    raw_input:       description,
    gemini_response: classification,
  });

  if (classification.priority === 'critical' || classification.urgency_score >= 85) {
    await supabase.from('complaint_status_history').insert({
      complaint_id: complaintId,
      old_status:   'submitted',
      new_status:   'verified',
      reason:       `AUTO-ESCALATED by AI (Score ${classification.urgency_score}): ${classification.summary_en}`,
    });
    await supabase.from('complaints').update({ status: 'verified' }).eq('id', complaintId);
  }

  return { id: complaintId, ...classification };
}
