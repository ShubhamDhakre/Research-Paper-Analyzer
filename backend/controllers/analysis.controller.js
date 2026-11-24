const { ResearchPaper, PaperAnalysis } = require('../models');
const pythonAIService = require('../services/pythonAI.service');

/**
 * @desc    Generate structured 12-section analysis for an uploaded paper
 * @route   POST /api/papers/:id/analyze
 * @access  Private
 */
exports.analyzePaper = async (req, res, next) => {
  try {
    const paper = await ResearchPaper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: `Research paper not found with id: ${req.params.id}`
      });
    }

    // Verify ownership
    if (paper.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to analyze this paper'
      });
    }

    // Return existing analysis if already performed and force re-analysis is not requested
    const force = req.query.force === 'true';
    if (!force) {
      const existing = await PaperAnalysis.findOne({ paper: paper._id }).lean();
      if (existing) {
        return res.status(200).json({
          status: 'success',
          message: 'Retrieved existing paper analysis',
          data: existing,
          cached: true
        });
      }
    }

    // Call Python AI Service for LLM-powered structured analysis
    const analysisData = await pythonAIService.analyzePaper(paper.filePath, paper.title);

    // Save or update in MongoDB PaperAnalysis collection
    const analysis = await PaperAnalysis.findOneAndUpdate(
      { paper: paper._id },
      {
        paper: paper._id,
        project: paper.project,
        user: req.user._id,
        paperTitle: analysisData.paper_title || paper.title,
        abstractSummary: analysisData.abstract_summary || '',
        researchProblem: analysisData.research_problem || '',
        researchObjectives: analysisData.research_objectives || '',
        proposedMethodology: analysisData.proposed_methodology || '',
        algorithmsTechniques: analysisData.algorithms_techniques || '',
        datasetsUsed: analysisData.datasets_used || '',
        experimentalSetup: analysisData.experimental_setup || '',
        resultsFindings: analysisData.results_findings || '',
        advantages: analysisData.advantages || '',
        limitations: analysisData.limitations || '',
        futureScope: analysisData.future_scope || '',
        analyzedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Mark paper status as 'indexed' if not already
    paper.processingStatus = 'indexed';
    await paper.save();

    res.status(200).json({
      status: 'success',
      message: 'Paper analysis generated successfully',
      data: analysis,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get existing analysis for a research paper
 * @route   GET /api/papers/:id/analysis
 * @access  Private
 */
exports.getPaperAnalysis = async (req, res, next) => {
  try {
    const paper = await ResearchPaper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: `Research paper not found with id: ${req.params.id}`
      });
    }

    if (paper.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view analysis for this paper'
      });
    }

    const analysis = await PaperAnalysis.findOne({ paper: paper._id }).lean();

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'No analysis found for this paper yet. Trigger analysis via POST /api/papers/:id/analyze'
      });
    }

    res.status(200).json({
      status: 'success',
      data: analysis
    });
  } catch (err) {
    next(err);
  }
};
