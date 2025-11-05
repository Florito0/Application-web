const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authenticateToken');
const {
    getEntrees,
    createEntree,
    updateEntree,
    deleteEntree,
    getEntreeById,
    getEntreesByDay,
    updateEntreesOrder,  // Ajout de la nouvelle fonction ici
    updateDayOrders
} = require('../Controllers/entreesController');

// GET /api/entrees - Récupérer toutes les prestations d'entrée
router.get('/', authMiddleware, getEntrees);

// GET /api/entrees/day/:day - Récupérer les prestations par jour
router.get('/day/:day', authMiddleware, getEntreesByDay);

// ✅ AJOUTER CETTE LIGNE AVANT /order
router.put('/day-orders', authMiddleware, updateDayOrders);

// PUT /api/entrees/order - Mettre à jour l'ordre (DOIT être avant /:id)
router.put('/order', authMiddleware, updateEntreesOrder);

// GET /api/entrees/:id - Récupérer une prestation spécifique
router.get('/:id', authMiddleware, getEntreeById);

// POST /api/entrees - Créer une nouvelle prestation d'entrée
router.post('/', authMiddleware, createEntree);

// PUT /api/entrees/:id - Mettre à jour une prestation d'entrée
router.put('/:id', authMiddleware, updateEntree);

// DELETE /api/entrees/:id - Supprimer une prestation d'entrée
router.delete('/:id', authMiddleware, deleteEntree);

module.exports = router;
