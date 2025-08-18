// server/controllers/mediatorProfileController.js
const MediatorProfile = require('../models/MediatorProfile');

/**
 * Normalize incoming array-like values.
 * Accepts array OR comma-separated string; returns clean string[]
 */
const normalizeArray = (val) => {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Pick only fields we allow to be updated on a profile.
 * (hourlyRate left out intentionally; not in schema)
 */
const pickUpdatable = (body = {}) => {
  const out = {};

  if (body.bio !== undefined) out.bio = String(body.bio || '');

  if (body.languages !== undefined) out.languages = normalizeArray(body.languages);

  if (body.specialties !== undefined) out.specialties = normalizeArray(body.specialties);

  if (body.location && typeof body.location === 'object') {
    out.location = {
      country: String(body.location.country || ''),
      city: String(body.location.city || ''),
    };
  }

  if (body.yearsExperience !== undefined) {
    const n = Number(body.yearsExperience);
    out.yearsExperience = Number.isFinite(n) && n >= 0 ? n : 0;
  }

  if (body.profilePhotoUrl !== undefined) {
    out.profilePhotoUrl = String(body.profilePhotoUrl || '');
  }

  if (body.isPublic !== undefined) out.isPublic = !!body.isPublic;

  return out;
};

/**
 * GET /api/mediator-profiles/me
 * (Mediator only) – returns own profile, creates an empty one if missing
 */
exports.getMyProfile = async (req, res) => {
  try {
    let doc = await MediatorProfile.findOne({ user: req.user._id }).populate(
      'user',
      'name role status'
    );

    if (!doc) {
      // create a minimal profile on first access
      doc = await MediatorProfile.create({ user: req.user._id });
      doc = await MediatorProfile.findById(doc._id).populate('user', 'name role status');
    }

    res.json({ profile: doc });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PATCH /api/mediator-profiles/me
 * (Mediator only) – upsert/updates own profile
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const updates = pickUpdatable(req.body);
    const doc = await MediatorProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, upsert: true }
    ).populate('user', 'name role status');

    res.json({ profile: doc });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/mediator-profiles/:userId
 * (Protected; optionally guard with admin check)
 * Used by Admin “Check Detail” to view a mediator’s public profile by user id.
 */
exports.getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await MediatorProfile.findOne({ user: userId }).lean();
    if (!profile) {
      return res.status(404).json({ message: 'Mediator profile not found' });
    }

    return res.json({ profile });
  } catch (err) {
    console.error('getProfileByUserId error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
