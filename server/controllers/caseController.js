// server/controllers/caseController.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const { UPLOAD_DIR } = require('../middleware/upload');

const ownerId = (user) => String(user?._id || user?.id || '');
const isAdmin = (user) => user?.role === 'Admin';
const isMediator = (user) => user?.role === 'Mediator';
const ensureOwner = (doc, user) => String(doc.claimantId) === ownerId(user);

// -------- Create / Submit / Read (client) --------
exports.createCase = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      amountInDispute,
      jurisdiction,
      respondent,
      confidential = false,
      urgent = false,
      submit = false,
    } = req.body;

    if (!title || !category || !description || !jurisdiction) {
      return res
        .status(400)
        .json({ message: 'title, category, description, jurisdiction are required' });
    }

    const payload = {
      title,
      category,
      description,
      amountInDispute,
      jurisdiction,
      respondent: respondent || {},
      claimantId: ownerId(req.user),
      confidential: !!confidential,
      urgent: !!urgent,
      status: submit ? 'Submitted' : 'Draft',
      auditLog: [{ event: 'CASE_CREATED', by: ownerId(req.user) }],
    };

    const created = await Case.create(payload);
    return res.status(201).json({ case: created });
  } catch (err) {
    console.error('createCase error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.submitCase = async (req, res) => {
  try {
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Case not found' });
    if (!ensureOwner(c, req.user)) return res.status(403).json({ message: 'Forbidden' });

    if (c.status === 'Submitted' || c.status === 'Assigned') {
      return res.json({ case: c, message: 'Already submitted' });
    }
    c.status = 'Submitted';
    c.auditLog.push({ event: 'CASE_SUBMITTED', by: ownerId(req.user) });
    await c.save();

    return res.json({ case: c });
  } catch (err) {
    console.error('submitCase error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyCases = async (req, res) => {
  try {
    const filter = { claimantId: ownerId(req.user) };
    if (req.query.status) filter.status = req.query.status;
    const list = await Case.find(filter).sort({ createdAt: -1 });
    return res.json({ cases: list });
  } catch (err) {
    console.error('getMyCases error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Allow owner; allow Admin for any case; allow Mediator only if assigned
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Guard against non-ObjectId like "assigned"
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid case id' });
    }

    const c = await Case.findById(id);
    if (!c) return res.status(404).json({ message: 'Case not found' });

    if (
      ensureOwner(c, req.user) ||
      isAdmin(req.user) ||
      (isMediator(req.user) && String(c.mediatorId || '') === ownerId(req.user))
    ) {
      return res.json({ case: c });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    console.error('getCaseById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// -------- Attachments (client owner) --------
exports.addAttachments = async (req, res) => {
  try {
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Case not found' });
    if (!ensureOwner(c, req.user)) return res.status(403).json({ message: 'Forbidden' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const newItems = req.files.map((f) => ({
      key: f.filename,
      filename: f.originalname,
      mime: f.mimetype,
      size: f.size,
      url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`,
      uploadedBy: ownerId(req.user),
    }));

    c.attachments.push(...newItems);
    c.auditLog.push({
      event: 'ATTACHMENTS_ADDED',
      by: ownerId(req.user),
      meta: { count: newItems.length },
    });

    await c.save();
    return res.json({ attachments: c.attachments });
  } catch (err) {
    console.error('addAttachments error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attId } = req.params;
    const c = await Case.findById(id);
    if (!c) return res.status(404).json({ message: 'Case not found' });
    if (!ensureOwner(c, req.user)) return res.status(403).json({ message: 'Forbidden' });

    const att = c.attachments.id(attId);
    if (!att) return res.status(404).json({ message: 'Attachment not found' });

    const filePath = path.join(UPLOAD_DIR, att.key);
    fs.unlink(filePath, () => {});

    att.deleteOne();
    c.auditLog.push({
      event: 'ATTACHMENT_REMOVED',
      by: ownerId(req.user),
      meta: { attId },
    });

    await c.save();
    return res.json({ attachments: c.attachments });
  } catch (err) {
    console.error('deleteAttachment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// -------- Admin: intake / assignment --------
exports.getSubmittedCasesForAdmin = async (_req, res) => {
  try {
    const list = await Case.find({ status: { $in: ['Submitted', 'Assigned'] } })
      .sort({ createdAt: -1 })
      .populate('claimantId', 'name email')
      .populate('mediatorId', 'name email');
    return res.json({ cases: list });
  } catch (err) {
    console.error('getSubmittedCasesForAdmin error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.assignMediator = async (req, res) => {
  try {
    const { id } = req.params;
    const { mediatorId } = req.body;

    if (!mediatorId) return res.status(400).json({ message: 'mediatorId is required' });

    const c = await Case.findById(id);
    if (!c) return res.status(404).json({ message: 'Case not found' });

    c.mediatorId = mediatorId;
    c.status = 'Assigned';
    c.auditLog.push({
      event: 'MEDIATOR_ASSIGNED',
      by: ownerId(req.user),
      meta: { mediatorId },
    });
    await c.save();

    const populated = await Case.findById(id)
      .populate('claimantId', 'name email')
      .populate('mediatorId', 'name email');

    return res.json({ case: populated });
  } catch (err) {
    console.error('assignMediator error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// -------- Mediator: list assigned-to-me --------
exports.getAssignedCasesForMediator = async (req, res) => {
  try {
    const list = await Case.find({ mediatorId: ownerId(req.user) })
      .sort({ createdAt: -1 })
      .populate('claimantId', 'name email');
    return res.json({ cases: list });
  } catch (err) {
    console.error('getAssignedCasesForMediator error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
