const pool = require('../db');

// Fonction helper pour parser JSON en sécurité
const safeJsonParse = (value) => {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            console.error('Error parsing JSON:', value, e);
            return [];
        }
    }
    return value || [];
};

// Récupérer toutes les prestations d'entrée pour un utilisateur
const getEntrees = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = `
            SELECT 
                e.id,
                e.days,
                e.presentation_low,
                e.presentation_normal,
                e.presentation_alcohol,
                e.presentation_soft,
                e.price,
                e.sex,
                e.pure_items,
                e.display_order,
                e.day_orders,
                e.created_at,
                e.updated_at
            FROM entrees e
            WHERE e.user_id = $1 AND e.days IS NOT NULL
            ORDER BY e.display_order ASC, e.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        const rows = result.rows;
        
        const entrees = rows.map(row => ({
            id: row.id,
            days: row.days || [],
            presentationLow: row.presentation_low,
            presentationNormal: row.presentation_normal,
            presentationAlcohol: row.presentation_alcohol,
            presentationSoft: row.presentation_soft,
            price: parseFloat(row.price || 0),
            sex: row.sex,
            pureItems: row.pure_items || [],
            display_order: row.display_order,
            dayOrders: row.day_orders || {}, // ✅ AJOUTER CETTE LIGNE
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
        
        res.json(entrees);
    } catch (error) {
        console.error('Erreur lors de la récupération des entrées:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des prestations d\'entrée',
            error: error.message 
        });
    }
};

// Créer une nouvelle prestation d'entrée
const createEntree = async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('=== DEBUG createEntree ===');
        console.log('req.body:', JSON.stringify(req.body, null, 2));
        
        let {
            days,
            presentationLow,
            presentationNormal,
            presentationAlcohol,
            presentationSoft,
            price,
            sex,
            pureItems
        } = req.body;

        // Normaliser le format des jours
        if (typeof days === 'string') {
            console.log('Converting string days to array:', days);
            days = days.split(',').map(day => day.trim());
        }
        
        console.log('Days after normalization:', days);
        console.log('=== END DEBUG ===');

        // Validation des données requises
        if (!days || !Array.isArray(days) || days.length === 0) {
            return res.status(400).json({
                message: 'Au moins un jour doit être sélectionné'
            });
        }

        // Vérifier qu'au moins une section est remplie
        const hasAccessData = presentationLow || presentationNormal ||
                             presentationAlcohol || presentationSoft || price;
        const hasPureData = pureItems && Array.isArray(pureItems) && pureItems.length > 0;

        if (!hasAccessData && !hasPureData) {
            return res.status(400).json({
                message: 'Au moins une section doit être complètement remplie (Les entrées ou Les entrées avec bouteille)'
            });
        }

        // Si des données d'accès existent, vérifier la cohérence
        if (hasAccessData) {
            const hasPresentation = presentationLow || presentationNormal ||
                                   presentationAlcohol || presentationSoft;
            const hasPrice = price && price > 0;

            if (hasPresentation && !hasPrice) {
                return res.status(400).json({
                    message: 'Un prix est requis si une présentation est définie'
                });
            }

            if (hasPrice && !hasPresentation) {
                return res.status(400).json({
                    message: 'Au moins une présentation est requise si un prix est défini'
                });
            }
        }

        // Validation des formules bouteille si présentes
        if (hasPureData) {
            for (let i = 0; i < pureItems.length; i++) {
                const pure = pureItems[i];
                
                if (!pure.details || !Array.isArray(pure.details) || pure.details.length === 0) {
                    return res.status(400).json({
                        message: `La formule bouteille ${i + 1} doit contenir au moins un détail`
                    });
                }

                for (let j = 0; j < pure.details.length; j++) {
                    const detail = pure.details[j];
                    
                    if (!detail.name || !detail.name.trim()) {
                        return res.status(400).json({
                            message: `Le nom est requis pour le détail ${j + 1} de la formule ${i + 1}`
                        });
                    }
                    
                    if (!detail.qty || detail.qty <= 0) {
                        return res.status(400).json({
                            message: `La quantité doit être supérieure à 0 pour le détail ${j + 1} de la formule ${i + 1}`
                        });
                    }
                    
                    if (!detail.price || detail.price <= 0) {
                        return res.status(400).json({
                            message: `Le prix doit être supérieur à 0 pour le détail ${j + 1} de la formule ${i + 1}`
                        });
                    }
                    
                    if (!detail.maxEntries || typeof detail.maxEntries !== 'object') {
                        return res.status(400).json({
                            message: `Les entrées maximales sont requises pour le détail ${j + 1} de la formule ${i + 1}`
                        });
                    }
                }
            }
        }

        const query = `
            INSERT INTO entrees (
                user_id,
                days,
                presentation_low,
                presentation_normal,
                presentation_alcohol,
                presentation_soft,
                price,
                sex,
                pure_items,
                discotheque_id,
                regle_tarification_id,
                taxe_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const values = [
            userId,
            JSON.stringify(days),
            presentationLow || null,
            presentationNormal || null,
            presentationAlcohol || null,
            presentationSoft || null,
            price || 0,
            sex || 'H/F',
            JSON.stringify(pureItems || []),
            null, // discotheque_id
            null, // regle_tarification_id  
            null  // taxe_id
        ];

        const result = await pool.query(query, values);
        const newEntree = result.rows[0];

        console.log('Data from DB:', newEntree);
        console.log('newEntree.days type:', typeof newEntree.days);
        console.log('newEntree.pure_items type:', typeof newEntree.pure_items);

        // CORRECTION : PostgreSQL JSONB retourne directement des objets
        const responseData = {
            id: newEntree.id,
            days: newEntree.days || [],
            presentationLow: newEntree.presentation_low,
            presentationNormal: newEntree.presentation_normal,
            presentationAlcohol: newEntree.presentation_alcohol,
            presentationSoft: newEntree.presentation_soft,
            price: parseFloat(newEntree.price || 0),
            sex: newEntree.sex,
            pureItems: newEntree.pure_items || [],
            createdAt: newEntree.created_at,
            updatedAt: newEntree.updated_at
        };

        res.status(201).json({
            message: 'Prestation d\'entrée créée avec succès',
            data: responseData
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'entrée:', error);
        res.status(500).json({
            message: 'Erreur lors de la création de la prestation d\'entrée',
            error: error.message
        });
    }
};

// Mettre à jour une prestation d'entrée
const updateEntree = async (req, res) => {
    try {
        const userId = req.user.id;
        const entreeId = req.params.id;
        
        let {
            days,
            presentationLow,
            presentationNormal,
            presentationAlcohol,
            presentationSoft,
            price,
            sex,
            pureItems
        } = req.body;

        // Normaliser le format des jours
        if (typeof days === 'string') {
            days = days.split(',').map(day => day.trim());
        }

        // Vérifier que l'entrée appartient à l'utilisateur et est une prestation
        const existingQuery = 'SELECT id FROM entrees WHERE id = $1 AND user_id = $2 AND days IS NOT NULL';
        const existingResult = await pool.query(existingQuery, [entreeId, userId]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Prestation d\'entrée non trouvée'
            });
        }

        // Validation similaire à la création
        if (!days || !Array.isArray(days) || days.length === 0) {
            return res.status(400).json({
                message: 'Au moins un jour doit être sélectionné'
            });
        }

        const query = `
            UPDATE entrees SET
                days = $1,
                presentation_low = $2,
                presentation_normal = $3,
                presentation_alcohol = $4,
                presentation_soft = $5,
                price = $6,
                sex = $7,
                pure_items = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 AND user_id = $10 AND days IS NOT NULL
            RETURNING *
        `;

        const values = [
            JSON.stringify(days),
            presentationLow || null,
            presentationNormal || null,
            presentationAlcohol || null,
            presentationSoft || null,
            price || 0,
            sex || 'H/F',
            JSON.stringify(pureItems || []),
            entreeId,
            userId
        ];

        const result = await pool.query(query, values);
        const updated = result.rows[0];

        const responseData = {
            id: updated.id,
            days: updated.days || [],
            presentationLow: updated.presentation_low,
            presentationNormal: updated.presentation_normal,
            presentationAlcohol: updated.presentation_alcohol,
            presentationSoft: updated.presentation_soft,
            price: parseFloat(updated.price || 0),
            sex: updated.sex,
            pureItems: updated.pure_items || [],
            createdAt: updated.created_at,
            updatedAt: updated.updated_at
        };

        res.json({
            message: 'Prestation d\'entrée mise à jour avec succès',
            data: responseData
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'entrée:', error);
        res.status(500).json({
            message: 'Erreur lors de la mise à jour de la prestation d\'entrée',
            error: error.message
        });
    }
};

// Supprimer une prestation d'entrée
const deleteEntree = async (req, res) => {
    try {
        const userId = req.user.id;
        const entreeId = req.params.id;

        // Vérifier que l'entrée appartient à l'utilisateur et est une prestation
        const existingQuery = 'SELECT id FROM entrees WHERE id = $1 AND user_id = $2 AND days IS NOT NULL';
        const existingResult = await pool.query(existingQuery, [entreeId, userId]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Prestation d\'entrée non trouvée'
            });
        }

        await pool.query(
            'DELETE FROM entrees WHERE id = $1 AND user_id = $2 AND days IS NOT NULL',
            [entreeId, userId]
        );

        res.json({
            message: 'Prestation d\'entrée supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'entrée:', error);
        res.status(500).json({
            message: 'Erreur lors de la suppression de la prestation d\'entrée',
            error: error.message
        });
    }
};

const updateEntreesOrder = async (req, res) => {
    // --- DÉBUT DES AJOUTS POUR LE DEBUG ---
    console.log("--- Requête reçue sur /api/entrees/order ---");
    console.log("Utilisateur (req.user):", req.user);
    console.log("Corps de la requête (req.body):", JSON.stringify(req.body, null, 2));
    // --- FIN DES AJOUTS POUR LE DEBUG ---
    
    try {
        const userId = req.user.id; // L'erreur est souvent ici si req.user est undefined
        const orderUpdates = req.body;

        if (!Array.isArray(orderUpdates) || orderUpdates.length === 0) {
            return res.status(400).json({ message: 'Données d\'ordre invalides.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of orderUpdates) {
                const query = `
                    UPDATE entrees 
                    SET display_order = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2 AND user_id = $3
                `;
                await client.query(query, [item.order, item.id, userId]);
            }

            await client.query('COMMIT');
            console.log("--- Ordre mis à jour avec succès en base de données ---");
            res.json({ message: 'Ordre mis à jour avec succès.' });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        // Ce message s'affichera dans le terminal du serveur en cas d'erreur
        console.error("ERREUR DÉTAILLÉE lors de la mise à jour de l'ordre:", error); 
        res.status(500).json({
            message: 'Erreur lors de la mise à jour de l\'ordre.',
            error: error.message
        });
    }
};

// Récupérer une prestation d'entrée spécifique
const getEntreeById = async (req, res) => {
    try {
        const userId = req.user.id;
        const entreeId = req.params.id;

        const query = `
            SELECT 
                id,
                days,
                presentation_low,
                presentation_normal,
                presentation_alcohol,
                presentation_soft,
                price,
                sex,
                pure_items,
                created_at,
                updated_at
            FROM entrees 
            WHERE id = $1 AND user_id = $2 AND days IS NOT NULL
        `;

        const result = await pool.query(query, [entreeId, userId]);
        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Prestation d\'entrée non trouvée'
            });
        }

        const entree = {
            id: rows[0].id,
            days: rows[0].days || [],
            presentationLow: rows[0].presentation_low,
            presentationNormal: rows[0].presentation_normal,
            presentationAlcohol: rows[0].presentation_alcohol,
            presentationSoft: rows[0].presentation_soft,
            price: parseFloat(rows[0].price || 0),
            sex: rows[0].sex,
            pureItems: rows[0].pure_items || [],
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at
        };

        res.json(entree);

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'entrée:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération de la prestation d\'entrée',
            error: error.message
        });
    }
};

// Récupérer les prestations d'entrée par jour
const getEntreesByDay = async (req, res) => {
    try {
        const userId = req.user.id;
        const { day } = req.params;

        if (!day) {
            return res.status(400).json({
                message: 'Le jour est requis'
            });
        }

        // Pour PostgreSQL, utilisation de l'opérateur JSON @>
        const query = `
            SELECT 
                id,
                days,
                presentation_low,
                presentation_normal,
                presentation_alcohol,
                presentation_soft,
                price,
                sex,
                pure_items,
                created_at,
                updated_at
            FROM entrees 
            WHERE user_id = $1 AND days @> $2 AND days IS NOT NULL
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query, [userId, JSON.stringify([day])]);
        const rows = result.rows;

        const entrees = rows.map(row => ({
            id: row.id,
            days: row.days || [],
            presentationLow: row.presentation_low,
            presentationNormal: row.presentation_normal,
            presentationAlcohol: row.presentation_alcohol,
            presentationSoft: row.presentation_soft,
            price: parseFloat(row.price || 0),
            sex: row.sex,
            pureItems: row.pure_items || [],
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json(entrees);

    } catch (error) {
        console.error('Erreur lors de la récupération des entrées par jour:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des prestations par jour',
            error: error.message
        });
    }
};

// Nouvelle fonction pour sauvegarder l'ordre par jour
const updateDayOrders = async (req, res) => {
    console.log("--- Requête reçue sur /api/entrees/day-orders ---");
    console.log("Utilisateur (req.user):", req.user);
    console.log("Corps de la requête (req.body):", JSON.stringify(req.body, null, 2));
    
    try {
        const userId = req.user.id;
        const orderUpdates = req.body;

        if (!Array.isArray(orderUpdates) || orderUpdates.length === 0) {
            return res.status(400).json({ message: 'Données d\'ordre invalides.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of orderUpdates) {
                const query = `
                    UPDATE entrees 
                    SET day_orders = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2 AND user_id = $3
                `;
                await client.query(query, [JSON.stringify(item.dayOrders), item.id, userId]);
            }

            await client.query('COMMIT');
            console.log("--- Ordre par jour mis à jour avec succès ---");
            res.json({ message: 'Ordre par jour mis à jour avec succès.' });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("ERREUR lors de la mise à jour de l'ordre par jour:", error); 
        res.status(500).json({
            message: 'Erreur lors de la mise à jour de l\'ordre par jour.',
            error: error.message
        });
    }
};

module.exports = {
    getEntrees,
    createEntree,
    updateEntree,
    deleteEntree,
    getEntreeById,
    getEntreesByDay,
    updateEntreesOrder,
    updateDayOrders
};
