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
      .replace(/^(here is the translation:|translation:|translated text:)\s*/i, '')
      .trim();

    return cleanedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
