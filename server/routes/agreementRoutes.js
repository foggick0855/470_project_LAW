// server/routes/agreementRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/agreementController');

// All routes require authentication
router.use(protect);

// FR-9 (Draft agreement versions)
router.post('/version', ctrl.createVersion);
router.get('/version/list', ctrl.listVersions);
router.get('/version/:versionId', ctrl.getVersion);

// FR-10 (Finalized agreement, locked read-only)
router.get('/final', ctrl.getFinal);
router.post('/finalize', ctrl.finalizeAgreement);

module.exports = router;
