import { resolveCity } from '../../lib/city.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { analyseComplaintPhoto } from '../../lib/analysePhoto.js';

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
  // 1. STRICT AUTH CHECK
  const { data: authData, error: authError } = await requireAuth(req);
  
  if (authError || !authData?.id) {
    return res.status(401).json({ error: 'Unauthorized: Please log in to submit a complaint' });
  }

  // 2. Extract fields from the request body
  const { title, description, category, severity, latitude, longitude, ward, photo_urls } = req.body;
  
  const finalUserId = authData.id; 

  if (!title || !category || !latitude || !longitude || !ward) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // ─── CHECK FOR DUPLICATES ──────────────────────────────────────────
    const { data: nearby } = await supabaseAdmin.rpc('find_nearby_complaint', {
      cat: category,
      lon: parseFloat(longitude),
      lat: parseFloat(latitude)
    });

    let duplicate_warning = null;
    if (nearby && nearby.length > 0) {
      duplicate_warning = `Similar complaint already exists (ID: ${nearby[0].id})`;
    }

    // 4. Insert the new complaint
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
      photo_urls: photo_urls || [],
      status: 'submitted'
    }).select().single(); // using .single() since we want the specific row back

    if (error) return res.status(400).json({ error: error.message });

    // 5. Return success response
    res.status(201).json({ 
      data: data, 
      message: 'Complaint created successfully',
      duplicate_warning
    });

    // 6. Run CV analysis in background — non-blocking
    if (data?.photo_urls?.length > 0) {
      analyseComplaintPhoto(data.photo_urls[0])
        .then(async (result) => {
          await supabaseAdmin
            .from('complaints')
            .update({
              cv_analysis: result,
              // Auto-bump severity if CV is confident and finds it worse
              ...(result.confidence > 0.8 && result.severity_estimate > data.severity
                ? { severity: result.severity_estimate }
                : {})
            })
            .eq('id', data.id);
        })
        .catch(err => console.error('CV analysis failed:', err));
    }

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
