const Review = require('../models/Review');
const Case = require('../models/Case');

// @desc   Create a review (client → mediator)
// @route  POST /api/cases/:caseId/reviews
// @access Client (only after final documents finalized)
exports.createReview = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.user.id;

    // check case
    const caze = await Case.findById(caseId).populate('assignedMediator');
    if (!caze) return res.status(404).json({ message: 'Case not found' });

    // ensure documents finalized
    if (!caze.documentsFinalized) {
      return res.status(400).json({ message: 'Reviews allowed only after final documents are completed.' });
    }

    // ensure client is participant
    if (!caze.participants.map(p => p.toString()).includes(clientId)) {
      return res.status(403).json({ message: 'Not authorized to review this case.' });
    }

    // create review
    const review = await Review.create({
      caseId,
      mediatorId: caze.assignedMediator,
      clientId,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already submitted a review for this case.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Get mediator reviews (public)
// @route  GET /api/mediators/:mediatorId/reviews
// @access Public
exports.getMediatorReviews = async (req, res) => {
  try {
    const { mediatorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ mediatorId })
      .select('-clientId') // hide client identity
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const count = await Review.countDocuments({ mediatorId });

    res.json({
      total: count,
      page,
      pages: Math.ceil(count / limit),
      reviews,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Get mediator review summary (avg + count)
// @route  GET /api/mediators/:mediatorId/review-summary
// @access Public
exports.getReviewSummary = async (req, res) => {
  try {
    const { mediatorId } = req.params;

    const summary = await Review.aggregate([
      { $match: { mediatorId: require('mongoose').Types.ObjectId(mediatorId) } },
      {
        $group: {
          _id: '$mediatorId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (!summary.length) {
      return res.json({ avgRating: 0, count: 0 });
    }

    res.json({
      avgRating: summary[0].avgRating.toFixed(1),
      count: summary[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
