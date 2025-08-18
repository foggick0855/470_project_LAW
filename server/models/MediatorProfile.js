// server/models/MediatorProfile.js
const mongoose = require('mongoose');

const MediatorProfileSchema = new mongoose.Schema(
  {
    // 1–1 link to User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // keep this; DO NOT also add a schema.index({user:1})
    },

    // Public directory fields
    bio: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    specialties: [{ type: String, trim: true }],
    location: {
      country: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    yearsExperience: { type: Number, default: 0 },
    profilePhotoUrl: { type: String, trim: true },

    // Directory visibility
    isPublic: { type: Boolean, default: true },

    // Ratings (future)
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ---------- Indexes ----------
// * Separate single-field indexes (OK for arrays)
MediatorProfileSchema.index({ languages: 1 });
MediatorProfileSchema.index({ specialties: 1 });
MediatorProfileSchema.index({ 'location.country': 1 });
MediatorProfileSchema.index({ 'location.city': 1 });
MediatorProfileSchema.index({ yearsExperience: -1 });
MediatorProfileSchema.index({ isPublic: 1 });

// * Text index for keyword search across several fields
MediatorProfileSchema.index({
  bio: 'text',
  languages: 'text',
  specialties: 'text',
  'location.country': 'text',
  'location.city': 'text',
});

module.exports = mongoose.model('MediatorProfile', MediatorProfileSchema);
