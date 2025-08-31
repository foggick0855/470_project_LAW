// server/server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(express.json());

// Serve uploaded files (profile photos, evidence, etc.)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

/* -------------------- Routes -------------------- */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/schedule', require('./routes/scheduleRoutes'));
app.use('/api/agreements', require('./routes/agreementRoutes'));

// FR-6: Mediator directory (public browse/search) + mediator self-service profile
app.use('/api/mediators', require('./routes/mediatorRoutes'));                // public list/view
app.use('/api/mediator-profiles', require('./routes/mediatorProfileRoutes')); // mediator edits + admin fetch

// ✅ NEW: Non-realtime chat routes
app.use('/api/messages', require('./routes/messageRoutes'));

/* -------------------- DB Connection -------------------- */
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,      // ok if you keep; driver ignores in v4+
    useUnifiedTopology: true,   // ok if you keep; driver ignores in v4+
    ssl: true,                  // keep consistent with your Atlas setup
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

/* -------------------- Health Check -------------------- */
app.get('/', (_req, res) => res.send('MERN backend running'));

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
