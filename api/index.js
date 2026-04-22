import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 1. IMPORT handlers instead of using require()
import registerHandler from './auth/register.js';
import loginHandler from './auth/login.js';
import verifyOtpHandler from './auth/verify-otp.js';
import meHandler from './auth/me.js';
import complaintsHandler from './complaints/index.js';
import complaintIdHandler from './complaints/[id].js';
import statusHandler from './complaints/[id]/status.js';
import geojsonHandler from './complaints/geojson.js';
import deleteHandler from './complaints/[id]/delete.js';
import statsHandler from './admin/stats.js';
import queueHandler from './admin/queue.js';
import usersHandler from './admin/users.js';
import userIdHandler from './admin/users/[id].js';

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

// 2. Updated Route Definitions
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/verify-otp', verifyOtpHandler);
app.get('/api/auth/me', meHandler);

app.get('/api/complaints', complaintsHandler);
app.post('/api/complaints', complaintsHandler);
app.get('/api/complaints/geojson', geojsonHandler);
app.get('/api/complaints/:id', complaintIdHandler);
app.patch('/api/complaints/:id/status', statusHandler);
app.delete('/api/complaints/:id', deleteHandler);

app.get('/api/admin/stats', statsHandler);
app.get('/api/admin/queue', queueHandler);
app.get('/api/admin/users', usersHandler);
app.patch('/api/admin/users/:id', userIdHandler);

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

// 3. EXPORT for Vercel (Don't use app.listen)
export default app;
