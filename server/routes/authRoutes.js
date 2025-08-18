// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);

// optional current-user endpoint if you use it
router.get('/me', protect, async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, role: req.user.role } });
});

module.exports = router;
