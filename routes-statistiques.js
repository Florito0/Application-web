const express = require('express');
const router = express.Router();
const { getStatistiques } = require('../controllers/statistiquesController');

router.get('/', getStatistiques);

module.exports = router;
