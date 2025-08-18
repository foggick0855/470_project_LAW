// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  approveMediator,
  denyMediator,
  banUser,
  unbanUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin-only endpoints
router.get('/all', protect, authorize('Admin'), getAllUsers);
router.get('/:id', protect, authorize('Admin'), getUserById);

router.patch('/mediators/:id/approve', protect, authorize('Admin'), approveMediator);
router.patch('/mediators/:id/deny', protect, authorize('Admin'), denyMediator);

router.patch('/:id/ban', protect, authorize('Admin'), banUser);
router.patch('/:id/unban', protect, authorize('Admin'), unbanUser);

module.exports = router;
