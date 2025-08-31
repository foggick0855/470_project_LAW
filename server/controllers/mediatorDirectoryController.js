// server/controllers/mediatorDirectoryController.js
const mongoose = require('mongoose');
const MediatorProfile = require('../models/MediatorProfile');
const Case = require('../models/Case'); // read embedded case reviews

// ----- helpers -----
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const userId = (u) => String(u?.id || u?._id || '');
const isAdmin = (u) => u?.role === 'Admin';
const allowSelfOrAdmin = (req, targetId) =>
  isAdmin(req.user) || userId(req.user) === String(targetId);

const isEligibleUser = (userDoc) => {
  if (!userDoc) return false;
  if (userDoc.role !== 'Mediator') return false;
  if (userDoc.status) return userDoc.status === 'Accepted';
  return !!userDoc.isVerified;
};

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ====== PUBLIC DIRECTORY ======

exports.listMediators = async (req, res) => {
  try {
    const {
      q,
      language,
      specialization,
      country,
      city,
      minExp,
      maxExp,
      minRate,
      maxRate,
      sort = 'nameAsc',
      page = 1,
      limit = 12,
    } = req.query;

    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lm = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);

    const matchProfile = { isPublic: true };

    if (language) {
      const langs = String(language).split(',').map(x => x.trim()).filter(Boolean);
      if (langs.length) matchProfile.languages = { $in: langs };
    }

    if (specialization) {
      const specs = String(specialization).split(',').map(x => x.trim()).filter(Boolean);
      if (specs.length) matchProfile.specialties = { $in: specs };
    }

    if (country) matchProfile['location.country'] = new RegExp(`^${escapeRegex(country)}`, 'i');
    if (city) matchProfile['location.city'] = new RegExp(`^${escapeRegex(city)}`, 'i');

    if (!isNaN(minExp)) matchProfile.yearsExperience = { ...(matchProfile.yearsExperience || {}), $gte: Number(minExp) };
    if (!isNaN(maxExp)) matchProfile.yearsExperience = { ...(matchProfile.yearsExperience || {}), $lte: Number(maxExp) };

    if (!isNaN(minRate)) matchProfile.hourlyRate = { ...(matchProfile.hourlyRate || {}), $gte: Number(minRate) };
    if (!isNaN(maxRate)) matchProfile.hourlyRate = { ...(matchProfile.hourlyRate || {}), $lte: Number(maxRate) };

    const textRegex = q && q.trim().length ? new RegExp(escapeRegex(q.trim()), 'i') : null;

    const sortMap = {
      nameAsc: { 'user.name': 1 },
      nameDesc: { 'user.name': -1 },
      expAsc: { yearsExperience: 1, 'user.name': 1 },
      expDesc: { yearsExperience: -1, 'user.name': 1 },
      rateAsc: { hourlyRate: 1, 'user.name': 1 },
      rateDesc: { hourlyRate: -1, 'user.name': 1 },
      ratingDesc: { ratingAverage: -1, ratingCount: -1, 'user.name': 1 },
    };
    const $sort = sortMap[sort] || sortMap.nameAsc;

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

    const totalAgg = await MediatorProfile.aggregate([...basePipeline, { $count: 'total' }]);
    const total = totalAgg.length ? totalAgg[0].total : 0;

    const items = await MediatorProfile.aggregate([
      ...basePipeline,
      { $sort },
      { $skip: (pg - 1) * lm },
      { $limit: lm },
      {
        $project: {
          bio: 1,
          languages: 1,
          specialties: 1,
          location: 1,
          yearsExperience: 1,
          hourlyRate: 1,
          profilePhotoUrl: 1,
          ratingAverage: 1,
          ratingCount: 1,
          isPublic: 1,
          updatedAt: 1,
          user: { _id: 1, name: 1, role: 1, status: 1, isVerified: 1, qualification: 1 },
        },
      },
    ]);

    res.json({ page: pg, limit: lm, total, pages: Math.ceil(total / lm), mediators: items });
  } catch (err) {
    console.error('listMediators error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

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

// ====== REVIEWS (from embedded Case.reviews[]) ======

// GET /api/mediators/:id/review-summary
exports.getReviewSummary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid mediator id' });
    }
    if (!allowSelfOrAdmin(req, id)) return res.status(403).json({ message: 'Forbidden' });

    const rows = await Case.aggregate([
      { $match: { mediatorId: oid(id), reviews: { $exists: true, $ne: [] } } },
      { $unwind: '$reviews' },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgRating: { $avg: '$reviews.rating' },
        },
      },
    ]);

    if (!rows.length) return res.json({ avgRating: 0, count: 0 });

    const { count, avgRating } = rows[0];
    return res.json({ count, avgRating: Number(avgRating.toFixed(1)) });
  } catch (err) {
    console.error('getReviewSummary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/mediators/:id/reviews?limit=20&page=1
exports.listReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid mediator id' });
    }
    if (!allowSelfOrAdmin(req, id)) return res.status(403).json({ message: 'Forbidden' });

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const agg = await Case.aggregate([
      { $match: { mediatorId: oid(id), reviews: { $exists: true, $ne: [] } } },
      { $unwind: '$reviews' },
      { $sort: { 'reviews.createdAt': -1 } },
      {
        $facet: {
          meta: [{ $count: 'total' }],
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'reviews.user',
                foreignField: '_id',
                as: 'reviewUser',
              },
            },
            { $unwind: { path: '$reviewUser', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                caseId: '$_id',
                caseTitle: '$title',
                rating: '$reviews.rating',
                comment: '$reviews.comment',
                createdAt: '$reviews.createdAt',
                user: {
                  _id: '$reviewUser._id',
                  name: '$reviewUser.name',
                  role: '$reviewUser.role',
                },
              },
            },
          ],
        },
      },
    ]);

    const items = agg[0]?.items || [];
    const total = agg[0]?.meta?.[0]?.total || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    return res.json({ reviews: items, total, page, pages });
  } catch (err) {
    console.error('listReviews error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
