const express = require('express');
const router = express.Router();
const { getReservations, createReservation } = require('../controllers/reservationsController');

router.get('/', getReservations);
router.post('/', createReservation);

module.exports = router;
