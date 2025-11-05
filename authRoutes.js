// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../Controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');

// Routes publiques (sans authentification)
router.post('/register', register);
router.post('/login', login);

// Route protégée pour obtenir l'utilisateur actuel
// IMPORTANT : Cette route nécessite le token JWT
router.get('/current-user', authenticateToken, getCurrentUser);

module.exports = router;
