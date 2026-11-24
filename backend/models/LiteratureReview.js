const mongoose = require('mongoose');

const literatureReviewSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please provide a title for the literature review'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      default: ''
    },
    selectedPapers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ResearchPaper'
      }
    ],
    wordCount: {
      type: Number,
      default: 0
    },
    lastEditedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

literatureReviewSchema.index({ project: 1, user: 1 });

module.exports = mongoose.model('LiteratureReview', literatureReviewSchema);
