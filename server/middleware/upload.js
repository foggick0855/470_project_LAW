// server/middleware/upload.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadsDir() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (e) {
    // If creation fails, throw to surface a clear error
    throw new Error(`Failed to create upload directory at ${UPLOAD_DIR}: ${e.message}`);
  }
}

// Ensure at require-time (in case server didn't pre-create it)
ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Double-check each request (safe on Windows + nodemon restarts)
    try {
      ensureUploadsDir();
      cb(null, UPLOAD_DIR);
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
const fileFilter = (_req, file, cb) => {
  if (ALLOWED.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only PDF, JPG, or PNG files are allowed'));
};

const limits = {
  fileSize: 10 * 1024 * 1024, // 10 MB per file
};

// Form field name must be "files"
const uploadEvidence = multer({ storage, fileFilter, limits }).array('files', 5);

module.exports = { uploadEvidence, UPLOAD_DIR };
