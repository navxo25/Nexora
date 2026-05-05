import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { resolveCity } from '../lib/city.js';
import { isRateLimited } from '../lib/rateLimit.js';
import { supabaseAdmin } from '../lib/supabase.js'; // Added for inline routes
import { requireAuth } from '../controllers/middleware/auth.js'; // Ensure path matches your project

// Auth Handlers
import registerHandler from '../controllers/auth/register.js';
import loginHandler from '../controllers/auth/login.js';
import verifyOtpHandler from '../controllers/auth/verify-otp.js';
import requestOtpHandler from '../controllers/auth/request-otp.js';
import meHandler from '../controllers/auth/me.js';

// Complaint Handlers
import complaintsHandler from '../controllers/complaints/index.js';
import statusHandler from '../controllers/complaints/[id]/status.js';
import geojsonHandler from '../controllers/complaints/geojson.js';
import complaintByIdHandler from '../controllers/complaints/[id]/index.js';

// Admin Handlers
import statsHandler from '../controllers/admin/stats.js';
import queueHandler from '../controllers/admin/queue.js';
import adminUsersHandler from '../controllers/admin/users/index.js';
import adminUserByIdHandler from '../controllers/admin/users/[id].js';

// Contractor Handlers
import contractorsHandler from './contractors/index.js';
import contractorByIdHandler from './contractors/[id].js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Sentry Initialization
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// --- GLOBAL CITY RESOLVER MIDDLEWARE ---
app.use(async (req, res, next) => {
  const { city, error } = await resolveCity(req);
  if (error) return res.status(400).json({ error });
  
  req.city = city;
  next();
});

// --- ROUTES ---

// 1. City Onboarding (Step 4 of Playbook)
app.post('/api/cities/onboard', async (req, res) => {
  try {
    const { data: user, error: authErr } = await requireAuth(req);
    if (authErr) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Superadmin only' });

    const { name, country, slug, timezone, default_lang, wards = [], bbox } = req.body;
    if (!name || !country || !slug) return res.status(400).json({ error: 'name, country, slug required' });

    const { data: city, error: cityErr } = await supabaseAdmin
      .from('cities')
      .insert({
        slug: slug.toLowerCase(),
        name, country, timezone: timezone || 'UTC',
        default_lang: default_lang || 'en',
        ...(bbox && { bbox_sw_lat: bbox.sw_lat, bbox_sw_lng: bbox.sw_lng, bbox_ne_lat: bbox.ne_lat, bbox_ne_lng: bbox.ne_lng })
      })
      .select().single();

    if (cityErr) return res.status(400).json({ error: cityErr.message });

    if (wards.length > 0) {
      const wardRows = wards.map(w => ({ city_id: city.id, name: w }));
      await supabaseAdmin.from('city_wards').insert(wardRows);
    }

    return res.status(201).json({ message: `City ${name} is live!`, slug: city.slug });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Public Open Data API (Module 05 of Playbook)
app.get('/api/public/data', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Rate limit: 100 requests/hour' });

  try {
    const { ward, format, limit = '500' } = req.query;

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .select('id, category, severity, status, ward, address, created_at')
      .eq('city_id', req.city.id)
      .limit(Math.min(parseInt(limit), 1000));

    if (error) throw error;

    if (format === 'csv') {
      const headers = ['id', 'category', 'severity', 'status', 'ward', 'address', 'created_at'];
      const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="nexora-${req.city.slug}.csv"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({ city: req.city.slug, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- EXISTING HANDLERS ---

// Auth
app.all('/api/auth/register', registerHandler);
app.all('/api/auth/login', loginHandler);
app.all('/api/auth/request-otp', requestOtpHandler);
app.all('/api/auth/verify-otp', verifyOtpHandler);
app.all('/api/auth/me', meHandler);

// Complaints
app.all('/api/complaints', complaintsHandler);
app.all('/api/complaints/geojson', geojsonHandler);
app.all('/api/complaints/:id', complaintByIdHandler);
app.all('/api/complaints/:id/status', statusHandler);

// Admin
app.all('/api/admin/stats', statsHandler);
app.all('/api/admin/queue', queueHandler);
app.all('/api/admin/users', adminUsersHandler);
app.all('/api/admin/users/:id', adminUserByIdHandler);

// Contractors
app.all('/api/contractors', contractorsHandler);
app.all('/api/contractors/:id', contractorByIdHandler);

// Health Check / Root
app.get('/api', (req, res) => {
  res.status(200).json({
    status: "Nexora Global API Online",
    active_city: req.city.name,
    country: req.city.country,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
