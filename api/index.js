import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { isRateLimited } from '../lib/rateLimit.js';

// Auth Handlers (Now importing from controllers)
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

dotenv.config();
const app = express();

// Security Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting Middleware
app.use(async (req, res, next) => {
  // Get the real client IP (Vercel sets x-forwarded-for)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';

  if (await isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Too many requests. Limit: 100 per hour.',
      retry_after: 3600
    });
  }
  next();
});


// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// --- Active Routes ---

app.all('/api/auth/register', registerHandler);
app.all('/api/auth/login', loginHandler);
app.all('/api/auth/verify-otp', verifyOtpHandler);
app.all('/api/auth/request-otp', requestOtpHandler);
app.all('/api/auth/me', meHandler);

app.all('/api/complaints', complaintsHandler);
app.all('/api/complaints/geojson', geojsonHandler);
app.all('/api/complaints/:id', complaintByIdHandler);
app.all('/api/complaints/:id/status', statusHandler);

// Admin Routes 
app.get('/api/admin/stats', statsHandler);
app.get('/api/admin/queue', queueHandler);
app.get('/api/admin/users', adminUsersHandler);
app.patch('/api/admin/users/:id', adminUserByIdHandler);

// --- Error Handling ---

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
