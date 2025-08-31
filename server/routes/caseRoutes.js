// server/routes/caseRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createCase,
  getMyCases,
  getCaseById,
  submitCase,
  addAttachments,
  deleteAttachment,
  getSubmittedCasesForAdmin,
  assignMediator,
  getAssignedCasesForMediator,
  addReview, // ✅ NEW: controller for posting reviews
} = require('../controllers/caseController');
const { uploadEvidence } = require('../middleware/upload');

// ----- Specific/literal routes FIRST (to avoid :id catching them) -----

// Client: list my cases
router.get('/mine', protect, authorize('Client'), getMyCases);

// Admin: list submitted/assigned cases
router.get('/submitted', protect, authorize('Admin'), getSubmittedCasesForAdmin);

// Mediator: list cases assigned to me
router.get('/assigned', protect, authorize('Mediator'), getAssignedCasesForMediator);

// Client: create a case (Draft or Submitted)
router.post('/', protect, authorize('Client'), createCase);

// Client: submit an existing draft
router.patch('/:id/submit', protect, authorize('Client'), submitCase);

// Client: attachments
router.post('/:id/attachments', protect, authorize('Client'), uploadEvidence, addAttachments);
router.delete('/:id/attachments/:attId', protect, authorize('Client'), deleteAttachment);

// Admin: assign mediator to a case
router.patch('/:id/assign', protect, authorize('Admin'), assignMediator);

// ✅ Client: leave a review on a case (must be before the catch-all :id route)
router.post('/:id/reviews', protect, authorize('Client'), addReview);

// ----- Catch-all ID route LAST -----
router.get('/:id', protect, getCaseById);

module.exports = router;
