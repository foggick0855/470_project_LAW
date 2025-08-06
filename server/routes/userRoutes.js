// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/users/all
// @desc    Get all users, categorized for admin dashboard
// @access  Admin only
router.get('/all', protect, authorize('Admin'), getAllUsers);

module.exports = router;
