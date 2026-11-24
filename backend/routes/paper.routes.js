const express = require('express');
const router = express.Router();
const {
  getPaperById,
  deletePaper
} = require('../controllers/paper.controller');
const {
  analyzePaper,
  getPaperAnalysis
} = require('../controllers/analysis.controller');
const { validateObjectId } = require('../middleware/validator');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router
  .route('/:id')
  .get(validateObjectId('id'), getPaperById)
  .delete(validateObjectId('id'), deletePaper);

// Paper Analysis Endpoints
router
  .route('/:id/analyze')
  .post(validateObjectId('id'), analyzePaper);

router
  .route('/:id/analysis')
  .get(validateObjectId('id'), getPaperAnalysis);

module.exports = router;
