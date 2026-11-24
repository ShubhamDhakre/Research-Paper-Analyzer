const { Project, ChatSession, ChatMessage } = require('../models');
const pythonAIService = require('../services/pythonAI.service');

/**
 * @desc    Send question to AI Research Assistant (RAG) and receive grounded answer with citations
 * @route   POST /api/projects/:id/chat
 * @access  Private
 */
exports.sendChatMessage = async (req, res, next) => {
  try {
    const { message, paperIdFilter } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message query cannot be empty'
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
        message: 'You are not authorized to access chat in this project'
      });
    }

    // Find or create active chat session for this project
    let session = await ChatSession.findOne({ project: project._id, user: req.user._id }).sort({ updatedAt: -1 });
    if (!session) {
      session = await ChatSession.create({
        project: project._id,
        user: req.user._id,
        title: `Research Chat - ${project.title}`
      });
    }

    // Save user message to database
    const userMsg = await ChatMessage.create({
      session: session._id,
      project: project._id,
      user: req.user._id,
      role: 'user',
      content: message.trim()
    });

    // Query RAG microservice
    let ragResult;
    try {
      ragResult = await pythonAIService.queryRAG(project._id, message.trim(), paperIdFilter);
    } catch (ragErr) {
      console.warn('[RAG Chat] Error querying Python service, providing fallback:', ragErr.message);
      ragResult = {
        answer: "I am unable to connect to the vector retrieval service right now. Please ensure the Python service is active.",
        citations: []
      };
    }

    // Format citations
    const formattedCitations = (ragResult.citations || []).map((c) => ({
      paperTitle: c.paper_title || 'Research Document',
      pageNumber: c.page_number || 1,
      excerpt: c.excerpt || ''
    }));

    // Save assistant message to database
    const assistantMsg = await ChatMessage.create({
      session: session._id,
      project: project._id,
      user: req.user._id,
      role: 'assistant',
      content: ragResult.answer || 'No response generated.',
      citations: formattedCitations
    });

    res.status(200).json({
      status: 'success',
      data: {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        grounded: ragResult.grounded !== false
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get chat message history for a project
 * @route   GET /api/projects/:id/chat
 * @access  Private
 */
exports.getChatHistory = async (req, res, next) => {
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
        message: 'You are not authorized to view chat in this project'
      });
    }

    const session = await ChatSession.findOne({ project: project._id, user: req.user._id }).sort({ updatedAt: -1 });

    if (!session) {
      return res.status(200).json({
        status: 'success',
        data: []
      });
    }

    const messages = await ChatMessage.find({ session: session._id })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      status: 'success',
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
};
