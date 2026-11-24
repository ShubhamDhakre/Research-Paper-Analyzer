const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

/**
 * Authentication Protection Middleware
 * Verifies Authorization: Bearer <token> header and attaches user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this resource. No authentication token provided.'
    });
  }

  try {
    const decoded = verifyToken(token);

    // Find user by ID and attach to request (omitting password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this authentication token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Invalid authentication token.'
    });
  }
};

module.exports = {
  protect
};
