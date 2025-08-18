// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const MediatorProfile = require('../models/MediatorProfile');
const generateToken = require('../utils/generateToken'); // signs { id, name, role }

// helper: accept comma-separated string or array
const splitCsv = (val) =>
  typeof val === 'string'
    ? val.split(',').map((s) => s.trim()).filter(Boolean)
    : Array.isArray(val)
    ? val
    : [];

exports.registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'Client',
      qualification = '',
      mediatorProfile, // optional: { bio, languages, specialties, location:{country,city}, yearsExperience, hourlyRate, profilePhotoUrl, isPublic }
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!['Client', 'Mediator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);

    // Unified status model used across the app
    const status = role === 'Mediator' ? 'Pending' : 'Accepted';

    // 1) Create the User
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      qualification,
      status,
    });

    // 2) If Mediator, create linked MediatorProfile (1–1)
    if (role === 'Mediator') {
      const mp = mediatorProfile || {};
      const payload = {
        user: user._id,
        bio: mp.bio || qualification || '',
        languages: splitCsv(mp.languages),
        specialties: splitCsv(mp.specialties),
        location: {
          country: mp.location?.country || '',
          city: mp.location?.city || '',
        },
        yearsExperience: Number(mp.yearsExperience) || 0,
        hourlyRate: Number(mp.hourlyRate) || 0,
        profilePhotoUrl: mp.profilePhotoUrl || '',
        isPublic: typeof mp.isPublic === 'boolean' ? mp.isPublic : true,
      };

      try {
        await MediatorProfile.create(payload);
      } catch (profileErr) {
        // roll back user if profile creation fails (keeps DB clean)
        await User.findByIdAndDelete(user._id).catch(() => {});
        console.error('MediatorProfile create failed:', profileErr);
        return res.status(500).json({ message: 'Failed to create mediator profile' });
      }
    }

    const safe = user.toObject();
    delete safe.password;

    return res.status(201).json({
      message:
        status === 'Pending'
          ? 'Registration received. Your mediator profile is pending admin review.'
          : 'Registration successful.',
      user: safe,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    // Block based on unified status
    if (user.status === 'Rejected') {
      return res.status(403).json({ message: 'Your profile is banned' });
    }
    if (user.role === 'Mediator' && user.status === 'Pending') {
      return res.status(403).json({ message: 'Your mediator profile is pending admin approval' });
    }

    const token = generateToken(user._id, user.name, user.role);
    return res.json({ token, name: user.name, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
