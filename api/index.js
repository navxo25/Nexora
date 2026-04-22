import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
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

// Auth routes
app.post('/api/auth/register', require('./auth/register.js').default);
app.post('/api/auth/login', require('./auth/login.js').default);
app.post('/api/auth/verify-otp', require('./auth/verify-otp.js').default);
app.get('/api/auth/me', require('./auth/me.js').default);

// Complaint routes
app.get('/api/complaints', require('./complaints/index.js').default);
app.post('/api/complaints', require('./complaints/index.js').default);
app.get('/api/complaints/:id', require('./complaints/[id].js').default);
app.patch('/api/complaints/:id/status', require('./complaints/[id]/status.js').default);
app.get('/api/complaints/geojson', require('./complaints/geojson.js').default);
app.delete('/api/complaints/:id', require('./complaints/[id]/delete.js').default);

// Admin routes
app.get('/api/admin/stats', require('./admin/stats.js').default);
app.get('/api/admin/queue', require('./admin/queue.js').default);
app.get('/api/admin/users', require('./admin/users.js').default);
app.patch('/api/admin/users/:id', require('./admin/users/[id].js').default);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
