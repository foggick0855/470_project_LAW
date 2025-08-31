// server/models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    mediatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true },
    status: { type: String, enum: ['Scheduled', 'Cancelled', 'Completed'], default: 'Scheduled', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who made the booking
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

AppointmentSchema.pre('save', function (next) {
  if (this.end <= this.start) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

AppointmentSchema.index({ mediatorId: 1, start: 1 });
AppointmentSchema.index({ clientId: 1, start: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
