// server/controllers/userController.js
const User = require('../models/User');

// @desc    Get categorized users for Admin dashboard
// @route   GET /api/users/all
// @access  Admin only
const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find({}, '-password'); // exclude password

    const pendingMediators = allUsers.filter(
      user => user.role === 'Mediator' && user.isVerified === false
    );

    const approvedMediators = allUsers.filter(
      user => user.role === 'Mediator' && user.isVerified === true
    );

    const clients = allUsers.filter(user => user.role === 'Client');

    res.json({
      pendingMediators,
      approvedMediators,
      clients
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllUsers };
