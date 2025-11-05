const express = require('express');
const router = express.Router();
const { getHoraires, saveHoraires } = require('../Controllers/horairesController');

// Note : le middleware authenticateToken sera appliqué dans le fichier principal (index.js)

// GET /api/horaires
router.get('/', getHoraires);

// POST /api/horaires  
router.post('/', saveHoraires);

module.exports = router;
