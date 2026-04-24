import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  // Check req.params (Express) first, fallback to req.query (Vercel Serverless)
  const id = req.params?.id || req.query?.id;

  if (!id) {
    return res.status(400).json({ error: 'Complaint ID is required' });
  }

  // Handle GET: Fetch a single complaint
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .select(`
          *,
          user:user_id (
            id,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Complaint not found' });
      }

      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching complaint:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Handle DELETE: Remove a complaint
  if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('complaints')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ message: 'Complaint deleted successfully' });
    } catch (error) {
      console.error('Error deleting complaint:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Fallback for unsupported methods
  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).json({ error: `Method ${req.method} not allowed` });
}
