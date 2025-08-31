// server/controllers/agreementController.js
const mongoose = require('mongoose');
const Case = require('../models/Case');
const User = require('../models/User');
const AgreementVersion = require('../models/AgreementVersion');
const FinalAgreement = require('../models/FinalAgreement');

/* ------------------------------ Helpers ------------------------------ */
const oid = (v) => new mongoose.Types.ObjectId(v);

async function loadCase(caseId) {
  const c = await Case.findById(caseId);
  if (!c) throw new Error('CASE_NOT_FOUND');
  return c;
}

async function assertParticipantOrAdmin(caze, user) {
  // Admins can view; only participants can edit pre-finalization
  if (user.role === 'Admin') return true;
  if (!caze.isParticipant || typeof caze.isParticipant !== 'function') {
    // fallback check if helpers weren’t added to Case model
    const isClaimant = caze.claimantId?.toString() === user._id.toString();
    const isMediator = caze.mediatorId?.toString() === user._id.toString();
    if (!isClaimant && !isMediator) throw new Error('NOT_IN_CASE');
    return true;
  }
  if (!caze.isParticipant(user._id)) throw new Error('NOT_IN_CASE');
  return true;
}

async function assertMediatorOfCase(caze, user) {
  const isMediator = caze.mediatorId && caze.mediatorId.toString() === user._id.toString();
  if (!isMediator) throw new Error('ONLY_MEDIATOR_CAN_FINALIZE');
}

/* ------------------------------ Controllers ------------------------------ */

/**
 * POST /api/agreements/version
 * body: { caseId, content }
 * Creates a new version (draft). Allowed for case claimant or mediator while not finalized.
 */
exports.createVersion = async (req, res) => {
  try {
    const { caseId, content } = req.body;
    if (!caseId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'caseId and content are required.' });
    }

    const caze = await loadCase(caseId);
    await assertParticipantOrAdmin(caze, req.user);

    // Block if already finalized
    const existingFinal = await FinalAgreement.findOne({ caseId: oid(caseId) });
    if (existingFinal) {
      return res.status(409).json({ success: false, message: 'Agreement already finalized for this case.' });
    }

    const version = await AgreementVersion.create({
      caseId: oid(caseId),
      authorId: req.user._id,
      content: content.trim(),
    });

    return res.json({ success: true, version });
  } catch (err) {
    const code = err.message === 'CASE_NOT_FOUND' ? 404 : 403;
    return res.status(code).json({ success: false, message: err.message || 'Error creating version.' });
  }
};

/**
 * GET /api/agreements/version/list?caseId=...
 * Lists versions (newest first). Visible to participants + admin.
 */
exports.listVersions = async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) return res.status(400).json({ success: false, message: 'caseId is required.' });

    const caze = await loadCase(caseId);
    await assertParticipantOrAdmin(caze, req.user);

    // If finalized, drafts should be gone (but return empty for safety)
    const final = await FinalAgreement.findOne({ caseId: oid(caseId) }).lean();
    if (final) return res.json({ success: true, finalized: true, versions: [] });

    const versions = await AgreementVersion
      .find({ caseId: oid(caseId) })
      .sort({ createdAt: -1 })
      .populate('authorId', 'name role')
      .lean();

    return res.json({ success: true, finalized: false, versions });
  } catch (err) {
    const code = err.message === 'CASE_NOT_FOUND' ? 404 : 403;
    return res.status(code).json({ success: false, message: err.message || 'Error listing versions.' });
  }
};

/**
 * GET /api/agreements/version/:versionId
 * Fetch single version (read-only preview).
 */
exports.getVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const version = await AgreementVersion.findById(versionId).populate('authorId', 'name role');
    if (!version) return res.status(404).json({ success: false, message: 'VERSION_NOT_FOUND' });

    const caze = await loadCase(version.caseId);
    await assertParticipantOrAdmin(caze, req.user);

    return res.json({ success: true, version });
  } catch (err) {
    const code = err.message === 'CASE_NOT_FOUND' ? 404 : 403;
    return res.status(code).json({ success: false, message: err.message || 'Error loading version.' });
  }
};

/**
 * GET /api/agreements/final?caseId=...
 * Return final agreement (locked), if exists.
 */
exports.getFinal = async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) return res.status(400).json({ success: false, message: 'caseId is required.' });

    const caze = await loadCase(caseId);
    await assertParticipantOrAdmin(caze, req.user);

    const final = await FinalAgreement.findOne({ caseId: oid(caseId) }).lean();
    if (!final) return res.status(404).json({ success: false, message: 'FINAL_NOT_FOUND' });

    return res.json({ success: true, final });
  } catch (err) {
    const code = err.message === 'CASE_NOT_FOUND' ? 404 : 403;
    return res.status(code).json({ success: false, message: err.message || 'Error loading final agreement.' });
  }
};

/**
 * POST /api/agreements/finalize
 * body: { caseId, versionId }  // versionId optional; if absent, uses latest version
 * Only mediator assigned to the case can finalize.
 * Creates FinalAgreement, deletes all versions, locks editing.
 */
exports.finalizeAgreement = async (req, res) => {
  try {
    const { caseId, versionId } = req.body;
    if (!caseId) return res.status(400).json({ success: false, message: 'caseId is required.' });

    const caze = await loadCase(caseId);
    await assertMediatorOfCase(caze, req.user);

    // Already finalized?
    const already = await FinalAgreement.findOne({ caseId: oid(caseId) });
    if (already) {
      return res.status(409).json({ success: false, message: 'Agreement already finalized.' });
    }

    // Choose content: specified version or latest
    let chosenVersion = null;
    if (versionId) {
      chosenVersion = await AgreementVersion.findOne({ _id: oid(versionId), caseId: oid(caseId) });
      if (!chosenVersion) return res.status(404).json({ success: false, message: 'VERSION_NOT_FOUND' });
    } else {
      chosenVersion = await AgreementVersion.findOne({ caseId: oid(caseId) }).sort({ createdAt: -1 });
      if (!chosenVersion) return res.status(400).json({ success: false, message: 'No draft versions to finalize.' });
    }

    // Create FinalAgreement (locked)
    const final = await FinalAgreement.create({
      caseId: oid(caseId),
      content: chosenVersion.content,
      signedByMediatorId: req.user._id,
      signedByMediatorName: req.user.name || 'Mediator',
      signedAt: new Date(),
      locked: true,
    });

    // Delete all previous versions for the case
    await AgreementVersion.deleteMany({ caseId: oid(caseId) });

    // ✅ set documentsFinalized on Case (unlocks client reviews)
    caze.documentsFinalized = true;
    caze.documentsFinalizedAt = new Date();
    await caze.save();

    return res.json({
      success: true,
      message: 'Agreement finalized and locked.',
      final,
      case: {
        _id: caze._id,
        documentsFinalized: caze.documentsFinalized,
        documentsFinalizedAt: caze.documentsFinalizedAt,
      },
    });
  } catch (err) {
    let status = 400;
    if (err.message === 'CASE_NOT_FOUND') status = 404;
    if (err.message === 'ONLY_MEDIATOR_CAN_FINALIZE') status = 403;
    return res.status(status).json({ success: false, message: err.message || 'Error finalizing agreement.' });
  }
};
