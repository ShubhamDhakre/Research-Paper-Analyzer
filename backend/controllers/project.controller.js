const { Project, ResearchPaper, PaperAnalysis } = require('../models');

/**
 * @desc    Get all projects belonging to the authenticated user
 * @route   GET /api/projects
 * @access  Private
 */
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      count: projects.length,
      data: projects
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single project by ID with its uploaded papers (verifying ownership)
 * @route   GET /api/projects/:id
 * @access  Private
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: `Project not found with id: ${req.params.id}`
      });
    }

    // Security check: ensure user owns this project
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to access this project'
      });
    }

    const papers = await ResearchPaper.find({ project: project._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        ...project,
        papers
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new project associated with authenticated user
 * @route   POST /api/projects
 * @access  Private
 */
exports.createProject = async (req, res, next) => {
  try {
    const { title, description, domain } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Project title is required'
      });
    }

    const project = await Project.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      domain: domain ? domain.trim() : 'General Computer Science',
      user: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: project
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update an existing project (verifying ownership)
 * @route   PUT /api/projects/:id
 * @access  Private
 */
exports.updateProject = async (req, res, next) => {
  try {
    const { title, description, domain } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: `Project not found with id: ${req.params.id}`
      });
    }

    // Security check: ensure user owns this project
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update this project'
      });
    }

    if (title) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (domain) project.domain = domain.trim();

    await project.save();

    res.status(200).json({
      status: 'success',
      data: project
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete project and cascade delete papers and analyses (verifying ownership)
 * @route   DELETE /api/projects/:id
 * @access  Private
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: `Project not found with id: ${req.params.id}`
      });
    }

    // Security check: ensure user owns this project
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this project'
      });
    }

    // Cascade delete papers and analysis
    await ResearchPaper.deleteMany({ project: project._id });
    await PaperAnalysis.deleteMany({ project: project._id });
    await project.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Project and all associated research documents removed successfully'
    });
  } catch (err) {
    next(err);
  }
};
