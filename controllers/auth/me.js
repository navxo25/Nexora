import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Assuming your auth middleware has already attached user info to the request
  const userId = req.user?.id; 

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch user profile and JOIN with the cities table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        cities (
          id,
          name,
          slug,
          default_lang
        )
      `)
      .eq('id', userId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
