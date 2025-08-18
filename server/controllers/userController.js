// server/controllers/userController.js
const User = require('../models/User');

// GET /api/users/all  (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const all = await User.find({}, '-password');

    const pendingMediators = all.filter(
      (u) => u.role === 'Mediator' && u.status === 'Pending'
    );
    const approvedMediators = all.filter(
      (u) => u.role === 'Mediator' && u.status === 'Accepted'
    );
    const clients = all.filter((u) => u.role === 'Client' && u.status === 'Accepted');

    return res.json({ pendingMediators, approvedMediators, clients });
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/:id  (Admin) – for “Check Summary”
exports.getUserById = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-password');
    if (!u) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: u });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/mediators/:id/approve  (Admin)
exports.approveMediator = async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (u.role !== 'Mediator') return res.status(400).json({ message: 'User is not a mediator' });

    u.status = 'Accepted';
    await u.save();

    const safe = u.toObject();
    delete safe.password;
    return res.json({ message: 'Mediator approved', user: safe });
  } catch (err) {
    console.error('Approve mediator error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/mediators/:id/deny  (Admin)
exports.denyMediator = async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (u.role !== 'Mediator') return res.status(400).json({ message: 'User is not a mediator' });

    u.status = 'Rejected';
    // Optional: u.denyReason = req.body?.reason || '';
    await u.save();

    const safe = u.toObject();
    delete safe.password;
    return res.json({ message: 'Mediator denied', user: safe });
  } catch (err) {
    console.error('Deny mediator error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/:id/ban  (Admin) – works for ANY role
exports.banUser = async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    u.status = 'Rejected';
    await u.save();

    const safe = u.toObject();
    delete safe.password;
    return res.json({ message: 'User banned', user: safe });
  } catch (err) {
    console.error('Ban user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/:id/unban  (Admin) – optional
exports.unbanUser = async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    // For Mediator previously accepted, restore to Accepted
    // For Client, always Accepted
    const newStatus = u.role === 'Mediator' ? 'Accepted' : 'Accepted';
    u.status = newStatus;
    await u.save();

    const safe = u.toObject();
    delete safe.password;
    return res.json({ message: 'User unbanned', user: safe });
  } catch (err) {
    console.error('Unban user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
