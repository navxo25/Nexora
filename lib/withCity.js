import { resolveCity } from './city.js';

export function withCity(handler) {
  return async (req, res) => {
    // 1. Resolve the city automatically
    const { city, error: cityErr } = await resolveCity(req);
    
    // 2. Handle invalid cities automatically
    if (cityErr) {
      return res.status(400).json({ error: cityErr });
    }

    // 3. Pass the valid 'city' object to your actual API route as a 3rd argument
    return handler(req, res, city);
  };
}
