import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach } from '@jest/globals';
import handler from '../api/complaints/index.js';

describe('Complaints API', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      query: {},
      headers: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('GET /api/complaints should return 200', async () => {
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('POST without auth should return 401', async () => {
    mockReq.method = 'POST';
    mockReq.body = { title: 'Test' };
    
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  test('Invalid method should return 405', async () => {
    mockReq.method = 'DELETE';
    
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});
