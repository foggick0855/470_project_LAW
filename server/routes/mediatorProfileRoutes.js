// server/routes/mediatorProfileRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getMyProfile,
  updateMyProfile,
  getProfileByUserId,
} = require('../controllers/mediatorProfileController');

/**
 * Define `/me` before param routes so "me" doesn't match `:userId`.
 */
router.get('/me', protect, authorize('Mediator'), getMyProfile);
router.patch('/me', protect, authorize('Mediator'), updateMyProfile);

/**
 * Admin (or relax to any authenticated user) can fetch a profile by *user id*.
 * If your authorize('Admin') was causing 403 due to role case or middleware mismatch,
 * switch to just `protect` for now (or keep authorize if it's working for you).
 */
// EITHER strict admin:
// router.get('/:userId', protect, authorize('Admin'), getProfileByUserId);
// router.get('/user/:userId', protect, authorize('Admin'), getProfileByUserId);

// OR relaxed (recommended while wiring up):
router.get('/:userId', protect, getProfileByUserId);
router.get('/user/:userId', protect, getProfileByUserId);

module.exports = router;
