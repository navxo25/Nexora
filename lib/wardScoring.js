import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from './supabase.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function computeScore(stats) {
  const base = 100;
  const openPenalty    = Math.min(stats.open_count * 0.5, 40);
  const slaPenalty     = (stats.sla_breach_pct || 0) * 0.3;
  const severityPenalty = (stats.avg_severity || 0) * 2;
  return Math.max(0, Math.round((base - openPenalty - slaPenalty - severityPenalty) * 100) / 100);
}

async function generatePrescription(ward, stats, samples) {
  const complaintsList = samples
    .slice(0, 20)
    .map(c => `- [${c.category} | severity ${c.severity}] ${c.description?.slice(0, 100)}`)
    .join('\n');

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `You are an urban infrastructure analyst for Mumbai.

Ward: ${ward}
Open complaints: ${stats.open_count}
Resolved: ${stats.resolved_count}
Avg severity (1-5): ${stats.avg_severity?.toFixed(2)}
SLA breach rate (72h): ${stats.sla_breach_pct?.toFixed(1)}%

Sample unresolved complaints:
${complaintsList}

Respond ONLY with valid JSON:
{
  "summary": "2-sentence plain English summary of ward health",
  "root_causes": ["cause 1", "cause 2", "cause 3"],
  "actions": [
    {"action": "specific action", "timeline": "2 weeks", "owner": "BMC Roads Dept"},
    {"action": "...", "timeline": "...", "owner": "..."}
  ],
  "priority": 3
}
Priority: 5=critical, 4=high, 3=medium, 2=low, 1=stable.`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

export async function runWeeklyScoring() {
  const { data: wards } = await supabaseAdmin
    .from('complaints')
    .select('ward')
    .not('ward', 'is', null);

  const uniqueWards = [...new Set(wards.map(r => r.ward))];

  for (const ward of uniqueWards) {
    // Compute stats for the last 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: wardComplaints } = await supabaseAdmin
      .from('complaints')
      .select('id, status, severity, created_at, resolved_at')
      .eq('ward', ward)
      .gte('created_at', cutoff);

    if (!wardComplaints?.length) continue;

    const open     = wardComplaints.filter(c => !['resolved','closed'].includes(c.status));
    const resolved = wardComplaints.filter(c => ['resolved','closed'].includes(c.status));
    const slaBreaches = open.filter(c =>
      (Date.now() - new Date(c.created_at)) / 3600000 > 72
    );
    const avgSeverity = wardComplaints.reduce((s, c) => s + (c.severity || 0), 0)
      / wardComplaints.length;

    const stats = {
      open_count:     open.length,
      resolved_count: resolved.length,
      avg_severity:   Math.round(avgSeverity * 100) / 100,
      sla_breach_pct: open.length ? Math.round((slaBreaches.length / open.length) * 10000) / 100 : 0
    };

    const score = computeScore(stats);

    // Write ward score
    await supabaseAdmin.from('ward_scores').insert({
      ward, score, ...stats, computed_at: new Date()
    });

    // Get sample open complaints for AI
    const { data: samples } = await supabaseAdmin
      .from('complaints')
      .select('category, severity, description')
      .eq('ward', ward)
      .not('status', 'in', '("resolved","closed")')
      .order('severity', { ascending: false })
      .limit(20);

    if (samples?.length) {
      try {
        const prescription = await generatePrescription(ward, stats, samples);
        await supabaseAdmin.from('prescriptions').insert({
          ward,
          summary:       prescription.summary,
          root_causes:   prescription.root_causes,
          actions:       prescription.actions,
          priority:      prescription.priority,
          model_version: 'gemini-1.5-flash'
        });
      } catch (err) {
        console.error(`Prescription failed for ward ${ward}:`, err.message);
      }
    }
  }
  console.log('Weekly ward scoring complete:', uniqueWards.length, 'wards processed');
}
