const express = require('express');
const router = express.Router();
const discothequeController = require('../controllers/discothequeController'); // Note: j'ai renommé pour la clarté

// GET /api/discotheque -> Récupère le profil de la discothèque de l'utilisateur
router.get('/', discothequeController.getDiscotheque);

// POST /api/discotheque -> Met à jour (ou crée) le profil
router.post('/', discothequeController.updateDiscotheque);

module.exports = router;
