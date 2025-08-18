// server/routes/mediatorRoutes.js
const express = require('express');
const router = express.Router();
const { listMediators, getMediator } = require('../controllers/mediatorDirectoryController');

// Public directory
router.get('/', listMediators);
router.get('/:id', getMediator);

module.exports = router;
