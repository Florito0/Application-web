const express = require('express');
const router = express.Router();
const { createKiosqueInteraction, assignVestiaireToInteraction, getKiosqueInteractions } = require('../controllers/kiosqueController');

router.post('/', createKiosqueInteraction);
router.post('/vestiaire', assignVestiaireToInteraction);
router.get('/', getKiosqueInteractions);

module.exports = router;
