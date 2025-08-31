// server/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getThreads,
  listMessages,
  sendMessage,
} = require('../controllers/messageController');

// Only Clients and Mediators participate in chat
router.get('/threads', protect, authorize('Client', 'Mediator'), getThreads);
router.get('/:caseId', protect, authorize('Client', 'Mediator'), listMessages);
router.post('/:caseId', protect, authorize('Client', 'Mediator'), sendMessage);

module.exports = router;
