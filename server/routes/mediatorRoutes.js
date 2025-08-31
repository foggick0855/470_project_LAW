// server/routes/mediatorRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listMediators,
  getMediator,
  getReviewSummary,
  listReviews,
} = require('../controllers/mediatorDirectoryController');

// Public directory
router.get('/', listMediators);

// ✅ Reviews (must be before "/:id")
router.get('/:id/review-summary', protect, getReviewSummary);
router.get('/:id/reviews', protect, listReviews);

// Public mediator profile by user id
router.get('/:id', getMediator);

module.exports = router;
