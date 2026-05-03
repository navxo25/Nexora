import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { translateToEnglish } from '../../lib/translate.js';

export default async function handler(req, res) {
  // 1. Resolve city context (Mumbai, Lagos, etc.)
  const { city, error: cityErr } = await resolveCity(req);
  if (cityErr) return res.status(400).json({ error: cityErr });

  try {
    // GET: Fetch city-specific complaints
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('*')
        .eq('city_id', city.id)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // POST: Create complaint with Multi-Language Support
    if (req.method === 'POST') {
      const { description, ...rest } = req.body;

      // 2. Auto-detect and translate to English
      // This handles Marathi, Hindi, Yoruba, etc. in one go
      const descriptionEn = await translateToEnglish(description);
      
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .insert({
          ...rest,
          description,            // Original (e.g. Marathi)
          description_en: descriptionEn, // Translation (English)
          lang: 'auto',           // Indicates auto-detected
          city_id: city.id
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Complaints Controller Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
