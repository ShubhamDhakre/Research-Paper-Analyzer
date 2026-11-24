const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
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
      default: 'New Research Chat'
    }
  },
  {
    timestamps: true
  }
);

chatSessionSchema.index({ project: 1, user: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
