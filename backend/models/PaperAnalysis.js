const mongoose = require('mongoose');

const paperAnalysisSchema = new mongoose.Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchPaper',
      required: true,
      unique: true
    },
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
    paperTitle: {
      type: String,
      required: true
    },
    // The 12 structured research sections
    abstractSummary: { type: String, default: '' },
    researchProblem: { type: String, default: '' },
    researchObjectives: { type: String, default: '' },
    proposedMethodology: { type: String, default: '' },
    algorithmsTechniques: { type: String, default: '' },
    datasetsUsed: { type: String, default: '' },
    experimentalSetup: { type: String, default: '' },
    resultsFindings: { type: String, default: '' },
    advantages: { type: String, default: '' },
    limitations: { type: String, default: '' },
    futureScope: { type: String, default: '' },

    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

paperAnalysisSchema.index({ project: 1 });

module.exports = mongoose.model('PaperAnalysis', paperAnalysisSchema);
