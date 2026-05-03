import { askGemini } from './gemini.js';

/**
 * Uses Gemini 1.5 Flash to auto-detect language and translate to English.
 * Supports Marathi, Hindi, Yoruba, Indonesian, Bengali, and Arabic.
 * Returns the original text if it's already English or if translation fails.
 */
export async function translateToEnglish(text) {
  // Return early for empty or very short strings
  if (!text || text.trim().length < 3) return text;

  const prompt = `Identify the language of the following civic complaint. 
  If it is Marathi, Hindi, Yoruba, Indonesian, Bengali, Arabic, or any other language, translate it to English. 
  If it is already in English, return it exactly as is.
  
  Provide ONLY the translated text. Do not include phrases like "Translated text:" or any explanations.
  
  Text: "${text}"`;

  try {
    const translatedText = await askGemini(prompt, 500);
    
    // Remove potential Markdown formatting or AI prefix/suffix chatter
    const cleanedText = translatedText
      .replace(/
http://googleusercontent.com/immersive_entry_chip/0

### Why this is better for Mumbai:
* **Universal Detection:** You no longer need to pass `city.default_lang`. Gemini will figure out if the user is typing in **Marathi** or **Hindi** automatically.
* **Cleaner Data:** The regex `replace` now catches common AI "introductions" (like "Translation: ...") to ensure your [Supabase description_en column](https://supabase.com/dashboard/project/vsxvkglaceqkpcgfltgu/sql/866a529d-f770-4ec2-a91f-c101cb103b09?schema=public) stays professional.
* **Zero-Cost:** You are still staying entirely within the [Gemini 1.5 Flash free tier](file:///C:/Users/prana/Downloads/nexora-phase3-playbook.html#2003).

Since you've now locked in the "Language Agnostic" backend, are we ready to move to **Step 3: AI Prescription Layer** to generate those automated ward health reports?
