const { Project, ResearchPaper, PaperAnalysis, LiteratureReview } = require('../models');
const pythonAIService = require('../services/pythonAI.service');

/**
 * @desc    Generate a literature review draft from selected project papers
 * @route   POST /api/projects/:id/literature-review/generate
 * @access  Private
 */
exports.generateReview = async (req, res, next) => {
  try {
    const { paperIds, theme } = req.body;

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
        message: 'You are not authorized to generate a literature review for this project'
      });
    }

    const paperQuery = { project: project._id };
    if (Array.isArray(paperIds) && paperIds.length > 0) {
      paperQuery._id = { $in: paperIds };
    }

    const papers = await ResearchPaper.find(paperQuery).lean();

    if (papers.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No papers found in this project to generate a literature review.'
      });
    }

    // Retrieve structured analyses
    const analyses = await PaperAnalysis.find({
      paper: { $in: papers.map((p) => p._id) }
    }).lean();

    const analysisMap = {};
    analyses.forEach((a) => {
      analysisMap[a.paper.toString()] = a;
    });

    const papersPayload = papers.map((p) => ({
      paper_id: p._id.toString(),
      paper_title: p.title,
      file_path: p.filePath,
      analysis: analysisMap[p._id.toString()] || null
    }));

    const result = await pythonAIService.generateLiteratureReview(papersPayload, theme);

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

/**
 * @desc    Save or update literature review draft in project
 * @route   POST /api/projects/:id/literature-review
 * @access  Private
 */
exports.saveReview = async (req, res, next) => {
  try {
    const { title, content, selectedPapers } = req.body;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: 'Content cannot be empty'
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
        message: 'You are not authorized to save reviews for this project'
      });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // Check if review already exists for this project
    let review = await LiteratureReview.findOne({ project: project._id, user: req.user._id });

    if (review) {
      review.title = title || review.title;
      review.content = content;
      review.selectedPapers = selectedPapers || review.selectedPapers;
      review.wordCount = wordCount;
      review.lastEditedAt = Date.now();
      await review.save();
    } else {
      review = await LiteratureReview.create({
        project: project._id,
        user: req.user._id,
        title: title || `Literature Review: ${project.title}`,
        content: content,
        selectedPapers: selectedPapers || [],
        wordCount: wordCount
      });
    }

    res.status(200).json({
      status: 'success',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current saved literature review for project
 * @route   GET /api/projects/:id/literature-review
 * @access  Private
 */
exports.getReview = async (req, res, next) => {
  try {
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
        message: 'You are not authorized to view reviews for this project'
      });
    }

    const review = await LiteratureReview.findOne({ project: project._id, user: req.user._id })
      .populate('selectedPapers', 'title')
      .lean();

    res.status(200).json({
      status: 'success',
      data: review || null
    });
  } catch (err) {
    next(err);
  }
};
