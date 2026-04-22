import { supabaseAdmin } from '../../lib/supabase.js';

export async function requireAuth(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return { error: 'Missing Authorization header' };
  }

  // Extract just the token part
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    // Let Supabase natively verify its own token!
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      return { error: 'Invalid or expired token' };
    }
    
    // Returns the properly formatted user object (with user.id)
    return { data: data.user }; 
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return { error: 'Authentication failed' };
  }
}

export async function optionalAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return { data: null };

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return { data: null };
    return { data: data.user };
  } catch (error) {
    return { data: null };
  }
}
