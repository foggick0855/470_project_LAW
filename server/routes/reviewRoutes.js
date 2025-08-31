const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createReview,
  getMediatorReviews,
  getReviewSummary,
} = require('../controllers/reviewController');

// ✅ Create review (client only, after docs finalized)
router.post('/cases/:caseId/reviews', protect, createReview);

// ✅ Public: get mediator reviews (paginated)
router.get('/mediators/:mediatorId/reviews', getMediatorReviews);

// ✅ Public: get mediator review summary (avg + count)
router.get('/mediators/:mediatorId/review-summary', getReviewSummary);

module.exports = router;
