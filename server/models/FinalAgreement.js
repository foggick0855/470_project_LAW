// server/models/FinalAgreement.js
const mongoose = require('mongoose');

const FinalAgreementSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      unique: true, // only one final agreement per case
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 200000, // stored as HTML/Markdown
    },
    signedByMediatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    signedByMediatorName: {
      type: String,
      required: true,
    },
    signedAt: {
      type: Date,
      default: Date.now,
    },
    locked: {
      type: Boolean,
      default: true, // once created, always locked
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinalAgreement', FinalAgreementSchema);
