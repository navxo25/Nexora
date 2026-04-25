import { supabaseAdmin } from './supabase.js';

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// Returns true if the request should be blocked (limit exceeded)
export async function isRateLimited(ip) {
  // Create an hourly window key like "2026-04-27T14"
  const now = new Date();
  const windowKey = `${now.toISOString().slice(0, 13)}`;

  try {
    // Upsert: insert a new row OR increment count if row exists
    const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
      p_ip: ip,
      p_window: windowKey
    });

    if (error) {
      console.error('Rate limit error:', error);
      return false; // fail open — do not block if Redis is down
    }

    return data > MAX_REQUESTS;
  } catch {
    return false; // fail open
  }
}
