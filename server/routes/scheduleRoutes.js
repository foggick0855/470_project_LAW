// server/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();

// ✅ NOTE: your folder is "middleware" (singular)
const { protect, authorize } = require('../middleware/authMiddleware');

const {
  addAvailability,
  getMyAvailability,
  deleteAvailability,
  getAvailabilityByMediator,
  getMyAppointments,
  createAppointment,
  cancelAppointment,
} = require('../controllers/scheduleController');

/* Availability (Mediator) */
router.post('/availability', protect, authorize('Mediator'), addAvailability);
router.get('/my-availability', protect, authorize('Mediator'), getMyAvailability);
router.delete('/availability/:id', protect, authorize('Mediator'), deleteAvailability);

/* Availability lookup (client + mediator) */
router.get('/availability', protect, authorize('Client', 'Mediator'), getAvailabilityByMediator);

/* Appointments (both roles) */
router.get('/my-appointments', protect, authorize('Client', 'Mediator'), getMyAppointments);
router.post('/appointments', protect, authorize('Client', 'Mediator'), createAppointment);
router.delete('/appointments/:id', protect, authorize('Client', 'Mediator'), cancelAppointment);

module.exports = router;
