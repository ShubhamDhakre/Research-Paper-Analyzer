const { Project, ResearchPaper } = require('../models');
const pythonAIService = require('../services/pythonAI.service');
const fs = require('fs');

/**
 * @desc    Verify claims and citations against project papers
 * @route   POST /api/projects/:id/verify-citations
 * @access  Private
 */
exports.verifyCitations = async (req, res, next) => {
  try {
    const { citations } = req.body;

    if (!Array.isArray(citations) || citations.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide at least one citation or claim to verify'
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: `Project not found with id: ${req.params.id}`
      });
    }

    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to verify citations in this project'
      });
    }

    // Retrieve all papers in this project
    const papers = await ResearchPaper.find({ project: project._id }).lean();

    // Format papers payload for verification engine
    const papersPayload = [];
    for (const p of papers) {
      let pages = [];
      // Extract pages from PDF if file exists
      if (p.filePath && fs.existsSync(p.filePath)) {
        try {
          const pdfData = await pythonAIService.processPDF(p.filePath, p.title);
          pages = pdfData.pages || [];
        } catch (e) {
          pages = [];
        }
      }

      papersPayload.push({
        paper_id: p._id.toString(),
        paper_title: p.title,
        total_pages: p.pageCount || pages.length || 1,
        pages: pages
      });
    }

    const verificationResult = await pythonAIService.verifyCitations(citations, papersPayload);

    res.status(200).json({
      status: 'success',
      data: verificationResult
    });
  } catch (err) {
    next(err);
  }
};
