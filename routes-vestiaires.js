const express = require('express');
const router = express.Router();
const { 
    getArticles, 
    createArticle, 
    updateArticle, 
    deleteArticle, 
    reorderArticles,
    getVestiaires, 
    assignVestiaire 
} = require('../Controllers/vestiairesController');

// ============= ROUTES ARTICLES =============
// GET - Récupérer tous les articles de vestiaire
router.get('/articles', getArticles);

// POST - Créer un nouvel article
router.post('/articles', createArticle);

// PUT - Modifier un article existant
router.put('/articles/:id', updateArticle);

// DELETE - Supprimer un article (soft delete)
router.delete('/articles/:id', deleteArticle);

// PUT - Réorganiser les articles
router.put('/articles/reorder', reorderArticles);

// ============= ROUTES VESTIAIRES =============
// GET - Récupérer tous les vestiaires
router.get('/', getVestiaires);

// POST - Assigner un vestiaire (créer avec numéro unique)
router.post('/assign', assignVestiaire);

module.exports = router;
