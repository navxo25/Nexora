import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: user, error: authError } = await requireAuth(req);
  if (authError) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: data });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
