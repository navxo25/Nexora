export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 8;
}

export function validateCoordinates(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function validateCategory(category) {
  const validCategories = ['pothole', 'garbage', 'lighting', 'water', 'traffic', 'other'];
  return validCategories.includes(category);
}

export function validateSeverity(severity) {
  const validSeverities = ['low', 'medium', 'high'];
  return !severity || validSeverities.includes(severity);
}

export function validateWard(ward) {
  return ward && ward.length > 0 && ward.length <= 100;
}
