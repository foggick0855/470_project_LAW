// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['Client', 'Admin', 'Mediator'],
      default: 'Client',
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
