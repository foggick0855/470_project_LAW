// server/models/AgreementVersion.js
const mongoose = require('mongoose');

const AgreementVersionSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // store minimal rich-text as HTML/Markdown string
    content: {
      type: String,
      required: true,
      maxlength: 200000, // safety cap; adjust if needed
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // we only care when the version was created
);

// Helpful compound index for timeline queries per case
AgreementVersionSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model('AgreementVersion', AgreementVersionSchema);
