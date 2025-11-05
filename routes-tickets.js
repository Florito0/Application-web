const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET : Récupérer tous les tickets
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
  }
});

module.exports = router;
