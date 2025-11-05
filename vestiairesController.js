const pool = require('../db');

// ============= ARTICLES DE VESTIAIRE =============

// Récupérer tous les articles de vestiaire
async function getArticles(req, res) {
    try {
        const userId = req.user.id;
        console.log('📋 Récupération articles vestiaire pour user:', userId);

        // Récupérer la discothèque de l'utilisateur
        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        const result = await pool.query(
            `SELECT id, nom, prix, ordre, actif, created_at, updated_at
             FROM articles_vestiaire 
             WHERE discotheque_id = $1 AND actif = true
             ORDER BY ordre ASC, id ASC`,
            [discothequeId]
        );

        console.log(`✅ ${result.rows.length} articles trouvés`);
        res.json({ articles: result.rows });

    } catch (err) {
        console.error('❌ Erreur getArticles:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
    }
}

// Créer un nouvel article de vestiaire
async function createArticle(req, res) {
    try {
        const userId = req.user.id;
        const { nom, prix } = req.body;

        console.log('➕ Création article vestiaire:', { nom, prix, userId });

        if (!nom || prix === undefined || prix < 0) {
            return res.status(400).json({ error: 'Nom et prix valides requis' });
        }

        // Récupérer la discothèque
        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        // Vérifier si un article avec le même nom existe déjà
        const existingArticle = await pool.query(
            'SELECT id FROM articles_vestiaire WHERE discotheque_id = $1 AND LOWER(nom) = LOWER($2) AND actif = true',
            [discothequeId, nom]
        );

        if (existingArticle.rows.length > 0) {
            return res.status(409).json({ error: 'Un article avec ce nom existe déjà' });
        }

        // Récupérer le dernier ordre
        const maxOrdreResult = await pool.query(
            'SELECT COALESCE(MAX(ordre), -1) as max_ordre FROM articles_vestiaire WHERE discotheque_id = $1',
            [discothequeId]
        );

        const nextOrdre = maxOrdreResult.rows[0].max_ordre + 1;

        // Insérer le nouvel article
        const result = await pool.query(
            `INSERT INTO articles_vestiaire (nom, prix, discotheque_id, user_id, ordre, actif)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING *`,
            [nom, prix, discothequeId, userId, nextOrdre]
        );

        console.log('✅ Article créé:', result.rows[0]);
        res.status(201).json({ article: result.rows[0] });

    } catch (err) {
        console.error('❌ Erreur createArticle:', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
    }
}

// Modifier un article de vestiaire
async function updateArticle(req, res) {
    try {
        const userId = req.user.id;
        const articleId = req.params.id;
        const { nom, prix } = req.body;

        console.log('✏️ Modification article:', { articleId, nom, prix });

        if (!nom || prix === undefined || prix < 0) {
            return res.status(400).json({ error: 'Nom et prix valides requis' });
        }

        // Récupérer la discothèque
        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        // Vérifier que l'article appartient bien à cette discothèque
        const articleCheck = await pool.query(
            'SELECT id FROM articles_vestiaire WHERE id = $1 AND discotheque_id = $2',
            [articleId, discothequeId]
        );

        if (articleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        // Vérifier si un autre article avec le même nom existe
        const duplicateCheck = await pool.query(
            'SELECT id FROM articles_vestiaire WHERE discotheque_id = $1 AND LOWER(nom) = LOWER($2) AND id != $3 AND actif = true',
            [discothequeId, nom, articleId]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Un article avec ce nom existe déjà' });
        }

        // Mettre à jour l'article
        const result = await pool.query(
            `UPDATE articles_vestiaire 
             SET nom = $1, prix = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND discotheque_id = $4
             RETURNING *`,
            [nom, prix, articleId, discothequeId]
        );

        console.log('✅ Article modifié:', result.rows[0]);
        res.json({ article: result.rows[0] });

    } catch (err) {
        console.error('❌ Erreur updateArticle:', err);
        res.status(500).json({ error: 'Erreur lors de la modification de l\'article' });
    }
}

// Supprimer un article de vestiaire (soft delete)
async function deleteArticle(req, res) {
    try {
        const userId = req.user.id;
        const articleId = req.params.id;

        console.log('🗑️ Suppression article:', articleId);

        // Récupérer la discothèque
        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        // Soft delete (marquer comme inactif au lieu de supprimer)
        const result = await pool.query(
            `UPDATE articles_vestiaire 
             SET actif = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND discotheque_id = $2
             RETURNING id`,
            [articleId, discothequeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        console.log('✅ Article supprimé (soft delete)');
        res.json({ message: 'Article supprimé avec succès' });

    } catch (err) {
        console.error('❌ Erreur deleteArticle:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
    }
}

// Réorganiser les articles
async function reorderArticles(req, res) {
    try {
        const userId = req.user.id;
        const { order } = req.body; // [{id: 1, ordre: 0}, {id: 2, ordre: 1}, ...]

        console.log('🔄 Réorganisation articles:', order);

        if (!Array.isArray(order)) {
            return res.status(400).json({ error: 'Format de données invalide' });
        }

        // Récupérer la discothèque
        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        // Utiliser une transaction pour garantir la cohérence
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            for (const item of order) {
                await client.query(
                    `UPDATE articles_vestiaire 
                     SET ordre = $1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2 AND discotheque_id = $3`,
                    [item.ordre, item.id, discothequeId]
                );
            }

            await client.query('COMMIT');
            console.log('✅ Ordre mis à jour');
            res.json({ message: 'Ordre mis à jour avec succès' });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('❌ Erreur reorderArticles:', err);
        res.status(500).json({ error: 'Erreur lors de la réorganisation' });
    }
}

// ============= GESTION DES VESTIAIRES (numéros) =============

// Récupérer tous les vestiaires
async function getVestiaires(req, res) {
    try {
        const userId = req.user.id;
        console.log('📋 Récupération vestiaires pour user:', userId);

        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        const result = await pool.query(
            `SELECT v.*, e.id as entree_id
             FROM vestiaires v
             LEFT JOIN entrees e ON v.entree_id = e.id
             WHERE v.discotheque_id = $1
             ORDER BY v.created_at DESC`,
            [discothequeId]
        );

        res.json({ vestiaires: result.rows });

    } catch (err) {
        console.error('❌ Erreur getVestiaires:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des vestiaires' });
    }
}

// Assigner un vestiaire (créer avec numéro unique)
async function assignVestiaire(req, res) {
    try {
        const userId = req.user.id;
        const { entree_id, articles } = req.body; // articles: [{id, quantite, prix_unitaire}]

        console.log('🎫 Assignation vestiaire:', { entree_id, articles });

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'Articles requis' });
        }

        // Récupérer la discothèque
        const discoResult = await pool.query(
            'SELECT id FROM discotheques WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (discoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée' });
        }

        const discothequeId = discoResult.rows[0].id;

        // Calculer le montant total
        const montantTotal = articles.reduce((sum, item) => {
            return sum + (item.quantite * item.prix_unitaire);
        }, 0);

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Générer un numéro unique avec la fonction PostgreSQL
            const numeroResult = await client.query(
                'SELECT generer_numero_vestiaire($1) as numero',
                [discothequeId]
            );

            const numeroVestiaire = numeroResult.rows[0].numero;

            // Créer le vestiaire
            const vestiaire = await client.query(
                `INSERT INTO vestiaires (numero_vestiaire, statut, entree_id, discotheque_id, user_id, montant_total)
                 VALUES ($1, 'occupé', $2, $3, $4, $5)
                 RETURNING *`,
                [numeroVestiaire, entree_id, discothequeId, userId, montantTotal]
            );

            const vestiaireId = vestiaire.rows[0].id;

            // Ajouter les articles liés
            for (const article of articles) {
                await client.query(
                    `INSERT INTO vestiaire_articles (vestiaire_id, article_vestiaire_id, quantite, prix_unitaire)
                     VALUES ($1, $2, $3, $4)`,
                    [vestiaireId, article.id, article.quantite, article.prix_unitaire]
                );
            }

            await client.query('COMMIT');

            console.log('✅ Vestiaire créé:', vestiaire.rows[0]);
            res.status(201).json({ 
                vestiaire: vestiaire.rows[0],
                numero: numeroVestiaire 
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('❌ Erreur assignVestiaire:', err);
        res.status(500).json({ error: 'Erreur lors de l\'assignation du vestiaire' });
    }
}

module.exports = {
    // Articles
    getArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    reorderArticles,
    // Vestiaires
    getVestiaires,
    assignVestiaire
};
