import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { translateToEnglish } from '../../lib/translate.js';

export default async function handler(req, res) {
  // 1. Resolve the city for all requests in this file
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  try {
    // GET: Fetch all complaints for the specific city
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('*')
        .eq('city_id', city.id)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // POST: Create a new complaint with Auto-Translation
    if (req.method === 'POST') {
      const { description, ...rest } = req.body;

      // 2. Use Gemini to translate if the city's default language isn't English
      // This happens silently before saving to the DB
      const descriptionEn = await translateToEnglish(description, city.default_lang);
      
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .insert({
          ...rest,
          description,
          description_en: descriptionEn, // Storing the AI translation
          lang: city.default_lang,       // Storing the source language (e.g., 'yo', 'id')
          city_id: city.id
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // Reject other methods
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Error in complaints/index:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
