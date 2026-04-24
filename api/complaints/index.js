import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

async function handleGET(req, res) {
  const { ward, status, limit = '50', offset = '0' } = req.query;

  try {
    let query = supabaseAdmin.from('complaints').select('*');

    if (ward) query = query.eq('ward', ward);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.range(
      parseInt(offset),
      parseInt(offset) + parseInt(limit) - 1
    );

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({
      data,
      count: data.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
}

async function handlePOST(req, res) {
  // 1. STRICT AUTH CHECK: Request must have a valid token
  const { data: authData, error: authError } = await requireAuth(req);
  
  if (authError || !authData?.id) {
    return res.status(401).json({ error: 'Unauthorized: Please log in to submit a complaint' });
  }

  // 2. Extract fields from the request body (Note: userId is no longer accepted from the body)
  const { title, description, category, severity, latitude, longitude, ward } = req.body;
  
  // 3. Lock the user ID to the person who is actually logged in
  const finalUserId = authData.id; 

  if (!title || !category || !latitude || !longitude || !ward) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabaseAdmin.from('complaints').insert({
      user_id: finalUserId,
      title,
      description: description || '',
      category,
      severity: severity || 'medium',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location: `SRID=4326;POINT(${longitude} ${latitude})`,
      ward,
      status: 'submitted'
    }).select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ 
      data: data[0], 
      message: 'Complaint created successfully' 
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGET(req, res);
  if (req.method === 'POST') return handlePOST(req, res);
  
  res.status(405).json({ error: 'Method not allowed' });
}
