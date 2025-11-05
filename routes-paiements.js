const express = require('express');
const router = express.Router();
const { getPaiements } = require('../controllers/paiementsController');

router.get('/', getPaiements);

module.exports = router;
