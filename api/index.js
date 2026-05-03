import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { resolveCity } from '../lib/city.js';
import { isRateLimited } from '../lib/rateLimit.js';

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
import contractorsHandler from '../controllers/contractors/index.js';
import contractorByIdHandler from '../controllers/contractors/[id].js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Sentry Initialization
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// --- GLOBAL CITY RESOLVER MIDDLEWARE ---
// This ensures every request through the Express router knows its city context
app.use(async (req, res, next) => {
  const { city, error } = await resolveCity(req);
  if (error) return res.status(400).json({ error });
  
  // Attach city to request for use in handlers
  req.city = city;
  next();
});

// --- ROUTES ---

// Auth
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/request-otp', requestOtpHandler);
app.post('/api/auth/verify-otp', verifyOtpHandler);
app.get('/api/auth/me', meHandler);

// Complaints
app.get('/api/complaints', complaintsHandler);
app.post('/api/complaints', complaintsHandler);
app.get('/api/complaints/geojson', geojsonHandler);
app.get('/api/complaints/:id', complaintByIdHandler);
app.patch('/api/complaints/:id/status', statusHandler);

// Admin
app.get('/api/admin/stats', statsHandler);
app.get('/api/admin/queue', queueHandler);
app.get('/api/admin/users', adminUsersHandler);
app.get('/api/admin/users/:id', adminUserByIdHandler);

// Contractors
app.get('/api/contractors', contractorsHandler);
app.get('/api/contractors/:id', contractorByIdHandler);

// Health Check / Root
app.get('/api', (req, res) => {
  res.status(200).json({
    status: "Nexora Global API Online",
    active_city: req.city.name,
    country: req.city.country,
    timestamp: new Date().toISOString()
  });
});

export default app;
