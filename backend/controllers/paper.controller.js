const path = require('path');
const fs = require('fs');
const { Project, ResearchPaper, PaperAnalysis } = require('../models');
const pythonAIService = require('../services/pythonAI.service');

/**
 * @desc    Upload a PDF research paper, extract text, and index into ChromaDB
 * @route   POST /api/projects/:id/papers
 * @access  Private
 */
exports.uploadPaper = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No PDF file uploaded. Please attach a valid PDF document with key "pdf".'
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        status: 'error',
        message: `Project not found with id: ${req.params.id}`
      });
    }

    if (project.user.toString() !== req.user._id.toString()) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to upload papers to this project'
      });
    }

    const paper = await ResearchPaper.create({
      title: path.basename(req.file.originalname, path.extname(req.file.originalname)),
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      processingStatus: 'processing',
      project: project._id,
      user: req.user._id
    });

    try {
      // Pass project._id and paper._id so Python service auto-chunks & indexes into ChromaDB
      const extraction = await pythonAIService.processPDF(
        req.file.path,
        req.file.originalname,
        project._id,
        paper._id
      );

      paper.title = extraction.title || paper.title;
      paper.pageCount = extraction.total_pages || 0;
      paper.processingStatus = 'indexed';
      if (extraction.metadata?.author) {
        paper.authors = [extraction.metadata.author];
      }
      await paper.save();

      project.papersCount = (project.papersCount || 0) + 1;
      await project.save();

      return res.status(201).json({
        status: 'success',
        message: 'Research paper uploaded, extracted, and indexed for RAG successfully',
        data: paper,
        extractionSummary: {
          totalPages: extraction.total_pages,
          totalCharacters: extraction.total_characters,
          chunksIndexed: extraction.chunks_indexed || 0,
          isScanned: extraction.is_scanned,
          scanNotice: extraction.scan_notice,
          pagePreview: extraction.pages?.slice(0, 2).map((p) => ({
            pageNumber: p.page_number,
            characterCount: p.character_count,
            snippet: p.text.substring(0, 150) + '...'
          }))
        }
      });
    } catch (extractErr) {
      paper.processingStatus = 'failed';
      paper.errorMessage = extractErr.message || 'PDF extraction failed in Python service';
      await paper.save();

      return res.status(422).json({
        status: 'error',
        message: `PDF text extraction failed: ${paper.errorMessage}`,
        paperId: paper._id,
        processingStatus: 'failed'
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get papers for a specific project
 * @route   GET /api/projects/:id/papers
 */
exports.getPapersByProject = async (req, res, next) => {
  try {
    const papers = await ResearchPaper.find({ project: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      count: papers.length,
      data: papers
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single paper by ID
 * @route   GET /api/papers/:id
 */
exports.getPaperById = async (req, res, next) => {
  try {
    const paper = await ResearchPaper.findById(req.params.id)
      .populate('project', 'title domain')
      .lean();

    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: `Research paper not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      status: 'success',
      data: paper
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete research paper and associated physical file
 * @route   DELETE /api/papers/:id
 */
exports.deletePaper = async (req, res, next) => {
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
        message: 'You are not authorized to delete this paper'
      });
    }

    if (paper.filePath && fs.existsSync(paper.filePath)) {
      try {
        fs.unlinkSync(paper.filePath);
      } catch (e) {
        console.warn(`Could not delete physical file at ${paper.filePath}:`, e.message);
      }
    }

    await Project.findByIdAndUpdate(paper.project, { $inc: { papersCount: -1 } });
    await PaperAnalysis.deleteMany({ paper: paper._id });
    await paper.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Research paper removed successfully'
    });
  } catch (err) {
    next(err);
  }
};
