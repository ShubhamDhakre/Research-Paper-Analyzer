const { Project, ResearchPaper, PaperAnalysis } = require('../models');
const pythonAIService = require('../services/pythonAI.service');

/**
 * @desc    Compare 2 or more research papers within a project across 10 dimensions
 * @route   POST /api/projects/:id/compare
 * @access  Private
 */
exports.comparePapers = async (req, res, next) => {
  try {
    const { paperIds } = req.body;

    if (!Array.isArray(paperIds) || paperIds.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Please select at least two research papers to compare'
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
        message: 'You are not authorized to perform comparisons in this project'
      });
    }

    // Fetch the papers belonging to this project
    const papers = await ResearchPaper.find({
      _id: { $in: paperIds },
      project: project._id
    }).lean();

    if (papers.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: `Found only ${papers.length} valid paper(s) in this project. At least 2 papers are required.`
      });
    }

    // Fetch existing structured analyses if available
    const analyses = await PaperAnalysis.find({
      paper: { $in: papers.map((p) => p._id) }
    }).lean();

    const analysisMap = {};
    analyses.forEach((a) => {
      analysisMap[a.paper.toString()] = a;
    });

    // Prepare payload for Python comparative engine
    const papersPayload = papers.map((p) => ({
      paper_id: p._id.toString(),
      paper_title: p.title,
      file_path: p.filePath,
      analysis: analysisMap[p._id.toString()] || null
    }));

    // Call Python comparative microservice
    const comparisonResult = await pythonAIService.comparePapers(papersPayload);

    res.status(200).json({
      status: 'success',
      data: {
        ...comparisonResult,
        papers: papers.map((p) => ({ id: p._id, title: p.title, authors: p.authors }))
      }
    });
  } catch (err) {
    next(err);
  }
};
