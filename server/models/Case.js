// server/models/Case.js
const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    key: String,            // storage key or path (for S3/local later)
    filename: String,
    mime: String,
    size: Number,
    url: String,            // public/presigned url (optional)
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AuditEntrySchema = new mongoose.Schema(
  {
    event: { type: String, required: true }, // e.g., CASE_CREATED, CASE_SUBMITTED, ATTACHMENTS_ADDED
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const CaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 6, maxlength: 100 },
    category: {
      type: String,
      enum: ['Property', 'Family', 'Employment', 'Commercial', 'Other'],
      required: true,
    },
    description: { type: String, required: true, maxlength: 5000 },
    amountInDispute: { type: Number, min: 0 },
    jurisdiction: { type: String, required: true },

    // Parties
    claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    respondent: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },

    attachments: [AttachmentSchema],

    confidential: { type: Boolean, default: false },
    urgent: { type: Boolean, default: false },

    // Workflow state
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Assigned'], // ⬅️ added "Assigned"
      default: 'Draft',
      index: true,
    },

    mediatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    auditLog: [AuditEntrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Case', CaseSchema);
