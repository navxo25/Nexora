import jwt from 'jsonwebtoken';

export async function requireAuth(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return { error: 'Missing Authorization header' };
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { data: decoded };
  } catch (error) {
    return { error: 'Invalid or expired token' };
  }
}

export function optionalAuth(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return { data: null };
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { data: decoded };
  } catch (error) {
    return { data: null };
  }
}
