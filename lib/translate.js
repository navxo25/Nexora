import { askGemini } from './gemini.js';

/**
 * Uses Gemini 1.5 Flash to auto-detect language and translate to English.
 * Returns the original text if it's already English or if translation fails.
 */
export async function translateToEnglish(text) {
  if (!text || text.trim().length < 3) return text;

  const prompt = `Identify the language of the following civic complaint and translate it to English. 
  If it is already in English, return it exactly as is.
  Provide ONLY the translated text without any explanations.
  
  Text: "${text}"`;

  try {
    const translatedText = await askGemini(prompt, 500);
    const cleanedText = translatedText.replace(/```json|```/g, '').trim();
    
    // If the AI just returned the same thing or a very short error, fallback safely
    return cleanedText || text;
  } catch (error) {
    console.error('Gemini Translation Error:', error);
    return text; // Safe fallback
  }
}
