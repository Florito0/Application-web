const express = require('express');
const router = express.Router();
const codesJourController = require('../controllers/codesJourController');

// Note : le middleware authenticateToken sera appliqué dans le fichier principal (index.js)

// GET /api/codes-jour/:year/:month
router.get('/:year/:month', codesJourController.getMonthCodes);

// POST /api/codes-jour
router.post('/', codesJourController.saveCode);

// POST /api/codes-jour/bulk
router.post('/bulk', codesJourController.saveBulkCodes);

module.exports = router;
