const mongoose = require('mongoose');

/**
 * Middleware to validate whether an :id or :projectId param is a valid MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid ID format for parameter: ${paramName}`
      });
    }
    next();
  };
};

module.exports = {
  validateObjectId
};
