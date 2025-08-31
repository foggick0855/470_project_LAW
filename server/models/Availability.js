// server/models/Availability.js
const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema(
  {
    mediatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    start: { type: Date, required: true, index: true }, // ISO
    end: { type: Date, required: true, index: true },   // ISO
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

// Ensure sane values
AvailabilitySchema.pre('save', function (next) {
  if (this.end <= this.start) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

AvailabilitySchema.index({ mediatorId: 1, start: 1, end: 1 });

module.exports = mongoose.model('Availability', AvailabilitySchema);
