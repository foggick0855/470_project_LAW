// server/controllers/scheduleController.js
const mongoose = require('mongoose');
const Case = require('../models/Case');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const isOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

const parseISO = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const e = new Error('Invalid date/time');
    e.status = 400;
    throw e;
  }
  return d;
};

const ensureMediator = (user) => {
  if (user.role !== 'Mediator') {
    const e = new Error('Mediator only');
    e.status = 403;
    throw e;
  }
};

const ensurePartyInCase = async (caseId, user) => {
  const c = await Case.findById(caseId).lean();
  if (!c) { const e = new Error('Case not found'); e.status = 404; throw e; }
  const isClient = String(c.claimantId) === String(user._id);
  const isMediator = String(c.mediatorId) === String(user._id);
  if (c.status !== 'Assigned' || (!isClient && !isMediator)) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  return c;
};

/* --------------------------- Availability (Mediator) --------------------------- */

// POST /api/schedule/availability   { start, end, note }
exports.addAvailability = async (req, res) => {
  try {
    ensureMediator(req.user);
    const start = parseISO(req.body?.start);
    const end = parseISO(req.body?.end);
    if (end <= start) return res.status(400).json({ message: 'End must be after start' });

    // Optional: prevent overlapping availability slots for the mediator (not required)
    const clash = await Availability.findOne({
      mediatorId: req.user._id,
      $or: [
        { start: { $lt: end }, end: { $gt: start } }, // overlap
      ],
    }).lean();

    if (clash) return res.status(409).json({ message: 'Overlaps an existing availability slot' });

    const doc = await Availability.create({
      mediatorId: req.user._id,
      start, end, note: req.body?.note?.trim() || '',
    });

    return res.status(201).json({ availability: doc });
  } catch (err) {
    console.error('addAvailability', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

// GET /api/schedule/my-availability?from=ISO&to=ISO
exports.getMyAvailability = async (req, res) => {
  try {
    ensureMediator(req.user);
    const q = { mediatorId: req.user._id };
    if (req.query.from || req.query.to) {
      const from = req.query.from ? parseISO(req.query.from) : new Date('1970-01-01');
      const to = req.query.to ? parseISO(req.query.to) : new Date('2999-12-31');
      q.start = { $gte: from };
      q.end = { $lte: to };
    }
    const items = await Availability.find(q).sort({ start: 1 }).lean();
    res.json({ availability: items });
  } catch (err) {
    console.error('getMyAvailability', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

// DELETE /api/schedule/availability/:id
exports.deleteAvailability = async (req, res) => {
  try {
    ensureMediator(req.user);
    const _id = req.params.id;
    const deleted = await Availability.findOneAndDelete({ _id, mediatorId: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteAvailability', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

// GET /api/schedule/availability?mediatorId=...&from=ISO&to=ISO  (for clients)
exports.getAvailabilityByMediator = async (req, res) => {
  try {
    const mediatorId = req.query.mediatorId;
    if (!mediatorId) return res.status(400).json({ message: 'mediatorId is required' });

    const q = { mediatorId };
    if (req.query.from || req.query.to) {
      const from = req.query.from ? parseISO(req.query.from) : new Date('1970-01-01');
      const to = req.query.to ? parseISO(req.query.to) : new Date('2999-12-31');
      q.start = { $gte: from };
      q.end = { $lte: to };
    }

    const items = await Availability.find(q).sort({ start: 1 }).lean();
    res.json({ availability: items });
  } catch (err) {
    console.error('getAvailabilityByMediator', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

/* ------------------------------ Appointments ------------------------------ */

// GET /api/schedule/my-appointments
exports.getMyAppointments = async (req, res) => {
  try {
    const role = req.user.role;
    const q = role === 'Mediator' ? { mediatorId: req.user._id } : { clientId: req.user._id };

    const items = await Appointment.find(q)
      .populate('caseId', 'title')
      .populate('mediatorId', 'name role')
      .populate('clientId', 'name role')
      .sort({ start: 1 })
      .lean();

    res.json({ appointments: items });
  } catch (err) {
    console.error('getMyAppointments', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

// POST /api/schedule/appointments   { caseId, start, end, note }
exports.createAppointment = async (req, res) => {
  try {
    const { caseId, start: s, end: e, note } = req.body || {};
    const c = await ensurePartyInCase(caseId, req.user);

    const start = parseISO(s), end = parseISO(e);
    if (end <= start) return res.status(400).json({ message: 'End must be after start' });

    const mediatorId = c.mediatorId;
    const clientId = c.claimantId;

    // Must fall within at least one availability slot of mediator
    const slot = await Availability.findOne({
      mediatorId,
      start: { $lte: start },
      end: { $gte: end },
    }).lean();
    if (!slot) return res.status(409).json({ message: 'Requested time is outside mediator availability' });

    // Conflict check: any overlapping appointment for mediator (and also for client)
    const overlapQuery = {
      status: { $ne: 'Cancelled' },
      $or: [
        // overlap condition
        { start: { $lt: end }, end: { $gt: start } },
      ],
    };
    const [mediatorClash, clientClash] = await Promise.all([
      Appointment.findOne({ mediatorId, ...overlapQuery }).lean(),
      Appointment.findOne({ clientId, ...overlapQuery }).lean(),
    ]);

    if (mediatorClash) return res.status(409).json({ message: 'Mediator already has an appointment in that time' });
    if (clientClash) return res.status(409).json({ message: 'You already have an appointment in that time' });

    const doc = await Appointment.create({
      caseId,
      mediatorId,
      clientId,
      start,
      end,
      status: 'Scheduled',
      createdBy: req.user._id,
      note: (note || '').trim(),
    });

    res.status(201).json({ appointment: doc });
  } catch (err) {
    console.error('createAppointment', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

// DELETE /api/schedule/appointments/:id
exports.cancelAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Not found' });

    // Only client or mediator on this appointment can cancel
    const isParty =
      String(appt.clientId) === String(req.user._id) ||
      String(appt.mediatorId) === String(req.user._id);
    if (!isParty) return res.status(403).json({ message: 'Forbidden' });

    if (appt.status === 'Cancelled') return res.json({ appointment: appt });

    appt.status = 'Cancelled';
    await appt.save();

    res.json({ appointment: appt });
  } catch (err) {
    console.error('cancelAppointment', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};
