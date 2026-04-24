import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Only importing files that ACTUALLY exist in your repo right now
import registerHandler from './auth/register.js';
import loginHandler from './auth/login.js';
import verifyOtpHandler from './auth/verify-otp.js';
import requestOtpHandler from './auth/request-otp.js'; 
import meHandler from './auth/me.js';
import complaintsHandler from './complaints/index.js';
import statusHandler from './complaints/[id]/status.js';
import geojsonHandler from './complaints/geojson.js';
import complaintByIdHandler from './complaints/[id]/index.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Active Routes
// Using app.all() lets the individual handlers manage their own 405 Method Not Allowed logic
app.all('/api/auth/register', registerHandler);
app.all('/api/auth/login', loginHandler);
app.all('/api/auth/verify-otp', verifyOtpHandler);
app.all('/api/auth/request-otp', requestOtpHandler);
app.all('/api/auth/me', meHandler);

app.all('/api/complaints', complaintsHandler);
app.all('/api/complaints/geojson', geojsonHandler);

app.all('/api/complaints/:id', complaintByIdHandler);
app.all('/api/complaints/:id/status', statusHandler);
// Temporarily disabled routes (Missing files)
// app.get('/api/complaints/:id', complaintIdHandler);
// app.get('/api/admin/stats', statsHandler);
// app.get('/api/admin/queue', queueHandler);
// app.get('/api/admin/users', usersHandler);
// app.patch('/api/admin/users/:id', userIdHandler);

// Error handling
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
