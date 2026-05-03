import { askGemini } from './gemini.js';

/**
 * Uses Gemini 1.5 Flash to translate text to English.
 * Falls back to original text if translation fails.
 */
export async function translateToEnglish(text, sourceLang) {
  // Skip if already English or empty
  if (!text || sourceLang === 'en') return text;

  const prompt = `Translate the following civic complaint from ${sourceLang} to English. 
  Maintain the original tone and specific details. 
  Respond ONLY with the translated text.
  
  Complaint: "${text}"`;

  try {
    const translatedText = await askGemini(prompt, 500);
    return translatedText.trim();
  } catch (error) {
    console.error('Translation Error:', error);
    return text; // Return original text so the app doesn't break
  }
}
