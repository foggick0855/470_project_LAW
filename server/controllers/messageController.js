// server/controllers/messageController.js
const mongoose = require('mongoose');
const Case = require('../models/Case');
const Message = require('../models/Message');

const ownerId = (user) => String(user?._id || user?.id || '');

const ensureCaseAccess = async (caseId, user) => {
  if (!mongoose.Types.ObjectId.isValid(caseId)) {
    const err = new Error('Invalid case id');
    err.status = 400;
    throw err;
  }

  const c = await Case.findById(caseId).lean();
  if (!c) {
    const err = new Error('Case not found');
    err.status = 404;
    throw err;
  }

  // Must be assigned and parties must match (Client vs Mediator)
  const isClientParty = String(c.claimantId || '') === ownerId(user);
  const isMediatorParty = String(c.mediatorId || '') === ownerId(user);

  // Only allow when case is Assigned and the user is one of the two parties
  if (c.status !== 'Assigned' || (!isClientParty && !isMediatorParty)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return c;
};

// GET /api/messages/threads
// List all accepted/assigned case threads for the current user (Client or Mediator)
exports.getThreads = async (req, res) => {
  try {
    const uid = ownerId(req.user);
    const role = req.user.role;

    let casesFilter = { status: 'Assigned' };
    if (role === 'Client') {
      casesFilter.claimantId = uid;
    } else if (role === 'Mediator') {
      casesFilter.mediatorId = uid;
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const cases = await Case.find(casesFilter)
      .select('title claimantId mediatorId updatedAt')
      .populate('claimantId', 'name role')
      .populate('mediatorId', 'name role')
      .sort({ updatedAt: -1 })
      .lean();

    if (!cases.length) return res.json({ threads: [] });

    // Pull last message per case using aggregation
    const caseIds = cases.map((c) => c._id);
    const lastByCase = await Message.aggregate([
      { $match: { caseId: { $in: caseIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$caseId',
          lastMessage: { $first: '$$ROOT' },
        },
      },
    ]);

    const lastMap = new Map(lastByCase.map((x) => [String(x._id), x.lastMessage]));

    const threads = cases.map((c) => {
      const counterpart =
        role === 'Client'
          ? { _id: c.mediatorId?._id, name: c.mediatorId?.name, role: c.mediatorId?.role }
          : { _id: c.claimantId?._id, name: c.claimantId?.name, role: c.claimantId?.role };

      const lm = lastMap.get(String(c._id));
      return {
        caseId: c._id,
        caseTitle: c.title,
        counterpart,
        lastMessage: lm
          ? {
              _id: lm._id,
              body: lm.body,
              senderId: lm.senderId,
              createdAt: lm.createdAt,
            }
          : null,
        updatedAt: c.updatedAt,
      };
    });

    return res.json({ threads });
  } catch (err) {
    console.error('getThreads error:', err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || 'Server error' });
  }
};

// GET /api/messages/:caseId?page=1&limit=50
exports.listMessages = async (req, res) => {
  try {
    const { caseId } = req.params;
    await ensureCaseAccess(caseId, req.user);

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Message.find({ caseId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ caseId }),
    ]);

    return res.json({
      page,
      limit,
      total,
      messages: items,
    });
  } catch (err) {
    console.error('listMessages error:', err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || 'Server error' });
  }
};

// POST /api/messages/:caseId   { body }
exports.sendMessage = async (req, res) => {
  try {
    const { caseId } = req.params;
    const c = await ensureCaseAccess(caseId, req.user);

    const body = (req.body?.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Message body is required' });

    // Determine receiver from the case
    const sender = ownerId(req.user);
    let receiver;
    if (String(c.claimantId) === sender) {
      receiver = c.mediatorId;
    } else if (String(c.mediatorId) === sender) {
      receiver = c.claimantId;
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!receiver) {
      return res.status(400).json({ message: 'Case has no assigned mediator yet' });
    }

    const doc = await Message.create({
      caseId,
      senderId: sender,
      receiverId: receiver,
      body,
    });

    return res.status(201).json({ message: doc });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || 'Server error' });
  }
};
