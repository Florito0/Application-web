const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authenticateToken = require('../middleware/authenticateToken'); // Assure-toi d'avoir ce fichier

// Route protégée pour mettre à jour l'abonnement
router.put('/users/subscription', authenticateToken, usersController.updateSubscription);

module.exports = router;
