// server/controllers/mediatorDirectoryController.js
const mongoose = require('mongoose');
const MediatorProfile = require('../models/MediatorProfile');

const isEligibleUser = (userDoc) => {
  // Accept either scheme:
  // - status === "Accepted" (your newer approach), or
  // - isVerified === true (older approach)
  if (!userDoc) return false;
  if (userDoc.role !== 'Mediator') return false;
  if (userDoc.status) return userDoc.status === 'Accepted';
  return !!userDoc.isVerified;
};

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/mediators (public)
exports.listMediators = async (req, res) => {
  try {
    const {
      q,
      language,
      specialization,
      country,
      city,
      minExp,
      maxRate,
      sort = 'nameAsc', // nameAsc | nameDesc | expDesc | rateAsc | rateDesc | ratingDesc
      page = 1,
      limit = 12,
    } = req.query;

    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lm = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);

    // Base profile match
    const matchProfile = { isPublic: true };

    if (language) {
      const langs = String(language)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (langs.length) matchProfile.languages = { $in: langs };
    }

    if (specialization) {
      const specs = String(specialization)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (specs.length) matchProfile.specialties = { $in: specs };
    }

    if (country) matchProfile['location.country'] = new RegExp(`^${escapeRegex(country)}`, 'i');
    if (city) matchProfile['location.city'] = new RegExp(`^${escapeRegex(city)}`, 'i');

    if (!isNaN(minExp)) matchProfile.yearsExperience = { ...(matchProfile.yearsExperience || {}), $gte: Number(minExp) };
    if (!isNaN(maxRate)) matchProfile.hourlyRate = { ...(matchProfile.hourlyRate || {}), $lte: Number(maxRate) };

    // Build search condition (regex across profile + user.name / user.qualification)
    const textRegex = q && q.trim().length ? new RegExp(escapeRegex(q.trim()), 'i') : null;

    // Sorting
    const sortMap = {
      nameAsc:   { 'user.name': 1 },
      nameDesc:  { 'user.name': -1 },
      expDesc:   { yearsExperience: -1, 'user.name': 1 },
      rateAsc:   { hourlyRate: 1, 'user.name': 1 },
      rateDesc:  { hourlyRate: -1, 'user.name': 1 },
      ratingDesc:{ ratingAverage: -1, ratingCount: -1, 'user.name': 1 },
    };
    const $sort = sortMap[sort] || sortMap.nameAsc;

    // Aggregate: Profile -> join User -> filter -> sort -> paginate
    const basePipeline = [
      { $match: matchProfile },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Only verified/accepted mediators
      {
        $match: {
          'user.role': 'Mediator',
          $or: [
            { 'user.status': 'Accepted' },
            { 'user.isVerified': true },
          ],
        },
      },
    ];

    if (textRegex) {
      basePipeline.push({
        $match: {
          $or: [
            { bio: textRegex },
            { languages: textRegex },
            { specialties: textRegex },
            { 'location.country': textRegex },
            { 'location.city': textRegex },
            { 'user.name': textRegex },
            { 'user.qualification': textRegex },
          ],
        },
      });
    }

    // Total count
    const totalAgg = await MediatorProfile.aggregate([
      ...basePipeline,
      { $count: 'total' },
    ]);

    const total = totalAgg.length ? totalAgg[0].total : 0;

    // Page data
    const items = await MediatorProfile.aggregate([
      ...basePipeline,
      { $sort },
      { $skip: (pg - 1) * lm },
      { $limit: lm },
      {
        $project: {
          // Profile fields
          bio: 1, languages: 1, specialties: 1, location: 1,
          yearsExperience: 1, hourlyRate: 1, profilePhotoUrl: 1,
          ratingAverage: 1, ratingCount: 1, isPublic: 1, updatedAt: 1,
          // User subset
          user: {
            _id: 1, name: 1, role: 1, status: 1, isVerified: 1,
          },
        },
      },
    ]);

    res.json({
      page: pg,
      limit: lm,
      total,
      pages: Math.ceil(total / lm),
      mediators: items,
    });
  } catch (err) {
    console.error('listMediators error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/mediators/:id (public profile by USER id)
exports.getMediator = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid mediator id' });
    }

    const item = await MediatorProfile
      .findOne({ user: id, isPublic: true })
      .populate('user', 'name role status isVerified qualification');

    if (!item || !isEligibleUser(item.user)) {
      return res.status(404).json({ message: 'Mediator not found' });
    }

    res.json({ mediator: item });
  } catch (err) {
    console.error('getMediator error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
