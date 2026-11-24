const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Check backend health and connectivity status
 * @access  Public
 */
router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  
  res.status(200).json({
    status: 'ok',
    service: 'backend-api',
    uptime: `${uptimeSeconds}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
