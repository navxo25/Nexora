import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../controllers/middleware/auth.js';
import { resolveCity } from '../../lib/city.js';

export default async function handler(req, res) {
  const { id } = req.query; // The contractor's UUID

  if (!id) {
    return res.status(400).json({ error: 'Contractor ID is required' });
  }

  try {
    // 1. Resolve the city context from headers or query
    const { city, error: cityErr } = await resolveCity(req);
    if (cityErr) return res.status(400).json({ error: cityErr });

    // ── GET — Fetch specific contractor details ────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('contractors')
        .select('*')
        .eq('id', id)
        .eq('city_id', city.id) // <-- Security: Restricted to active city
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Contractor not found in this city' });
      }
      return res.status(200).json(data);
    }

    // ── PATCH — Update contractor (Admin/Moderator only) ───────────────
    if (req.method === 'PATCH') {
      const { data: user, error: authErr } = await requireAuth(req);
      if (authErr) return res.status(401).json({ error: 'Unauthorized' });

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!['admin', 'moderator'].includes(profile?.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { data, error } = await supabaseAdmin
        .from('contractors')
        .update(req.body)
        .eq('id', id)
        .eq('city_id', city.id) // <-- Security: Prevents cross-city tampering
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // ── DELETE — Remove contractor (Admin only) ───────────────────────
    if (req.method === 'DELETE') {
      const { data: user, error: authErr } = await requireAuth(req);
      if (authErr) return res.status(401).json({ error: 'Unauthorized' });

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Superadmin only' });
      }

      const { error } = await supabaseAdmin
        .from('contractors')
        .delete()
        .eq('id', id)
        .eq('city_id', city.id); // <-- Security: Prevents cross-city deletion

      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(`Error in contractor [id] handler:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
