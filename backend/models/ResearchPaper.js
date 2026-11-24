const mongoose = require('mongoose');

const researchPaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a paper title'],
      trim: true
    },
    authors: {
      type: [String],
      default: []
    },
    publicationYear: {
      type: Number,
      default: null
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required']
    },
    storedFileName: {
      type: String,
      required: [true, 'Stored file name is required']
    },
    filePath: {
      type: String,
      required: [true, 'File storage path is required']
    },
    fileSizeBytes: {
      type: Number,
      required: true
    },
    pageCount: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'application/pdf'
    },
    processingStatus: {
      type: String,
      enum: ['uploaded', 'processing', 'indexed', 'failed'],
      default: 'uploaded'
    },
    errorMessage: {
      type: String,
      default: null
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Paper must be associated with a project']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Paper must belong to a user']
    }
  },
  {
    timestamps: true
  }
);

researchPaperSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('ResearchPaper', researchPaperSchema);
