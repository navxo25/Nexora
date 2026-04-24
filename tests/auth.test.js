import { describe, test, expect, beforeEach } from '@jest/globals';
import app from '../api/index.js';
import request from 'supertest';

describe('Auth API', () => {
  // ── Register ────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    test('returns 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'Test1234!' });
      expect(res.status).toBe(400);
    });

    test('returns 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'abc' });
      expect(res.status).toBe(400);
    });

    test('returns 405 for non-POST method', async () => {
      const res = await request(app)
        .get('/api/auth/register');
      expect(res.status).toBe(405);
    });
  });

  // ── Request OTP ─────────────────────────────────────────────────
  describe('POST /api/auth/request-otp', () => {
    test('returns 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({});
      expect(res.status).toBe(400);
    });

    test('returns 405 for non-POST method', async () => {
      const res = await request(app)
        .get('/api/auth/request-otp');
      expect(res.status).toBe(405);
    });
  });

  // ── /me endpoint ────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    test('returns 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this-is-not-a-real-token');
      expect(res.status).toBe(401);
    });
  });
});
