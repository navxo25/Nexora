import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 configuration
export const options = {
  vus: 100,       // 100 virtual users
  duration: '60s', // run for 60 seconds
  thresholds: {
    http_req_failed: ['rate<0.01'],     // fail if error rate > 1%
    http_req_duration: ['p(95)<500'],    // fail if p95 latency > 500ms
  },
};

const BASE = 'https://nexora-kohl-rho.vercel.app';

// Each virtual user runs this function in a loop
export default function () {
  // Test 1: Health check (fastest endpoint — baseline)
  const health = http.get(`${BASE}/api/health`);
  check(health, { 'health is 200': r => r.status === 200 });

  // Test 2: List complaints (common read operation)
  const list = http.get(`${BASE}/api/complaints?limit=20`);
  check(list, { 'complaints list is 200': r => r.status === 200 });

  // Test 3: GeoJSON (map endpoint Riya calls frequently)
  const geo = http.get(`${BASE}/api/complaints/geojson`);
  check(geo, { 'geojson is 200': r => r.status === 200 });

  sleep(0.5); // wait 500ms between iterations per VU
}
