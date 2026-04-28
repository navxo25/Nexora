import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CATEGORIES = [
  'pothole','waterlogging','broken_footpath','garbage_dump',
  'damaged_streetlight','encroachment','sewage_overflow','other'
];

export async function analyseComplaintPhoto(photoUrl) {
  // Download the image from Cloudinary
  const resp = await fetch(photoUrl);
  if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);

  const buffer = await resp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = resp.headers.get('content-type') || 'image/jpeg';

  // Force JSON output automatically
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `Analyse this Mumbai urban infrastructure complaint photo.
Respond ONLY with valid JSON:
{
  "detected_issue": "one of: ${CATEGORIES.join(', ')}",
  "severity_estimate": 1,
  "confidence": 0.0,
  "description": "one sentence describing what you see",
  "is_genuine": true,
  "is_duplicate_risk": false
}
severity_estimate: 1=minor, 5=critical. confidence: 0.0–1.0.
is_genuine: false if clearly unrelated to urban infrastructure.
is_duplicate_risk: true if scene strongly resembles another common issue type.`;

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType: mediaType } },
    prompt
  ]);

  return JSON.parse(result.response.text());
}
