const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/project.controller');
const { getPapersByProject, uploadPaper } = require('../controllers/paper.controller');
const { sendChatMessage, getChatHistory } = require('../controllers/chat.controller');
const { comparePapers } = require('../controllers/comparison.controller');
const { analyzeProjectGaps } = require('../controllers/gap.controller');
const { generateReview, saveReview, getReview } = require('../controllers/literature.controller');
const { verifyCitations } = require('../controllers/citation.controller');
const { validateObjectId } = require('../middleware/validator');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// All project routes require authentication
router.use(protect);

router
  .route('/')
  .get(getProjects)
  .post(createProject);

router
  .route('/:id')
  .get(validateObjectId('id'), getProjectById)
  .put(validateObjectId('id'), updateProject)
  .delete(validateObjectId('id'), deleteProject);

// Papers nested under project
router
  .route('/:id/papers')
  .get(validateObjectId('id'), getPapersByProject)
  .post(validateObjectId('id'), upload.single('pdf'), uploadPaper);

// RAG AI Chat nested under project
router
  .route('/:id/chat')
  .get(validateObjectId('id'), getChatHistory)
  .post(validateObjectId('id'), sendChatMessage);

// Multi-Paper Comparison nested under project
router
  .route('/:id/compare')
  .post(validateObjectId('id'), comparePapers);

// Potential Research Gaps nested under project
router
  .route('/:id/research-gaps')
  .post(validateObjectId('id'), analyzeProjectGaps);

// Literature Review nested under project
router
  .route('/:id/literature-review')
  .get(validateObjectId('id'), getReview)
  .post(validateObjectId('id'), saveReview);

router
  .route('/:id/literature-review/generate')
  .post(validateObjectId('id'), generateReview);

// Citation Verification nested under project
router
  .route('/:id/verify-citations')
  .post(validateObjectId('id'), verifyCitations);

module.exports = router;
