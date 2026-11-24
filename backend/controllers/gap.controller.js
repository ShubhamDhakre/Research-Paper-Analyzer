const { Project, ResearchPaper, PaperAnalysis } = require('../models');
const pythonAIService = require('../services/pythonAI.service');

/**
 * @desc    Analyze potential research gaps across papers in a project
 * @route   POST /api/projects/:id/research-gaps
 * @access  Private
 */
exports.analyzeProjectGaps = async (req, res, next) => {
  try {
    const { paperIds } = req.body;

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
        message: 'You are not authorized to analyze research gaps for this project'
      });
    }

    // Determine filter for papers: specific paper IDs or all papers in project
    const paperQuery = { project: project._id };
    if (Array.isArray(paperIds) && paperIds.length > 0) {
      paperQuery._id = { $in: paperIds };
    }

    const papers = await ResearchPaper.find(paperQuery).lean();

    if (papers.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No papers found in this project to analyze research gaps. Please upload at least one paper.'
      });
    }

    // Retrieve any pre-extracted structured analyses for these papers
    const analyses = await PaperAnalysis.find({
      paper: { $in: papers.map((p) => p._id) }
    }).lean();

    const analysisMap = {};
    analyses.forEach((a) => {
      analysisMap[a.paper.toString()] = a;
    });

    // Format payload for Python Gap Analyzer
    const papersPayload = papers.map((p) => ({
      paper_id: p._id.toString(),
      paper_title: p.title,
      file_path: p.filePath,
      analysis: analysisMap[p._id.toString()] || null
    }));

    // Call Python AI microservice
    const result = await pythonAIService.analyzeResearchGaps(papersPayload);

    res.status(200).json({
      status: 'success',
      data: {
        ...result,
        papers: papers.map((p) => ({ id: p._id, title: p.title }))
      }
    });
  } catch (err) {
    next(err);
  }
};
