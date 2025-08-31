// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['Client', 'Admin', 'Mediator'],
      default: 'Client',
      index: true,
    },

    // Mediator’s bio / qualification summary
    qualification: { type: String, default: '' },

    // Unified status for ALL users
    // "Pending"   -> awaiting approval (used for Mediators)
    // "Accepted"  -> active user (default for Clients, approved Mediators)
    // "Rejected"  -> banned/denied
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Accepted',
      index: true,
    },

    // Helpful to soft-disable access if needed
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

/* ----------------------------- Tiny role helpers ---------------------------- */
userSchema.methods.isMediator = function () {
  return this.role === 'Mediator';
};
userSchema.methods.isClient = function () {
  return this.role === 'Client';
};
userSchema.methods.isAdmin = function () {
  return this.role === 'Admin';
};

module.exports = mongoose.model('User', userSchema);
