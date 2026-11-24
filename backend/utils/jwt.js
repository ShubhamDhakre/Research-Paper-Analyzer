const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a given user ID
 * Defaults to 7-day expiration
 */
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret_key_min_32_chars';
  return jwt.sign({ id: userId }, secret, {
    expiresIn: '7d'
  });
};

/**
 * Verify a given JWT token and return decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret_key_min_32_chars';
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken
};
