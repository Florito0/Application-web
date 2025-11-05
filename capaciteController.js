// controllers/capaciteController.js
const pool = require('../db');

const cron = require('node-cron'); // npm install node-cron

// Démarrer le scheduler automatique
const startAutoResetScheduler = () => {
    console.log('🕐 [SCHEDULER] Démarrage système horaire pour discothèque');
    
    // Vérifier toutes les heures (à la minute 0)
    cron.schedule('0 * * * *', async () => {
        const now = new Date();
        const currentHour = now.getHours();
        
        console.log(`🕐 [SCHEDULER] Vérification horaire: ${currentHour}h00`);
        
        try {
            await checkAndExecuteScheduledResets();
        } catch (error) {
            console.error('❌ [SCHEDULER] Erreur:', error);
        }
    });
    
    console.log('✅ [SCHEDULER] Configuré pour vérifications horaires (optimal discothèque)');
};

// Vérifier et exécuter les réinitialisations programmées
const checkAndExecuteScheduledResets = async () => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    console.log(`🕐 [SCHEDULER] Vérification ${currentDay} ${currentTime}`);
    
    try {
        // Récupérer toutes les capacités avec des planifications actives
        const query = `
            SELECT id, user_id, reset_schedule, current, last_reset
            FROM capacite 
            WHERE reset_schedule IS NOT NULL 
            AND reset_schedule != '{}'::jsonb
            AND is_active = true
        `;
        
        const result = await pool.query(query);
        
        for (const capacite of result.rows) {
            const schedule = capacite.reset_schedule;
            
            // Vérifier si ce jour/heure est programmé
            if (schedule[currentDay] && schedule[currentDay] !== 'Désactivé') {
                const scheduledTime = schedule[currentDay];
                
                if (scheduledTime === currentTime) {
                    console.log(`🔄 [SCHEDULER] Réinitialisation automatique pour user ${capacite.user_id}`);
                    
                    // Exécuter la réinitialisation
                    await executeAutoReset(capacite.id, capacite.user_id);
                }
            }
        }
    } catch (error) {
        console.error('❌ [SCHEDULER] Erreur lors de la vérification:', error);
    }
};

// Exécuter une réinitialisation automatique
const executeAutoReset = async (capaciteId, userId) => {
    const client = await pool.connect();
    try {
        await client.query(`SET app.user_id = '${userId}'`);
        
        const updateQuery = `
            UPDATE capacite 
            SET current = 0,
                last_reset = CURRENT_TIMESTAMP,
                daily_peak = 0
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await client.query(updateQuery, [capaciteId]);
        
        if (result.rows.length > 0) {
            console.log(`✅ [SCHEDULER] Réinitialisation automatique réussie pour capacité ${capaciteId}`);
            
            // Optionnel : Enregistrer un log de l'action
            await logAutoResetAction(userId, capaciteId, client);
        }
        
    } catch (error) {
        console.error(`❌ [SCHEDULER] Erreur réinitialisation capacité ${capaciteId}:`, error);
    } finally {
        client.release();
    }
};

// Enregistrer un log de l'action automatique (optionnel)
const logAutoResetAction = async (userId, capaciteId, client) => {
    try {
        await client.query(
            `INSERT INTO capacite_logs (user_id, capacite_id, action, timestamp) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [userId, capaciteId, 'AUTO_RESET']
        );
    } catch (error) {
        console.log('ℹ️ [SCHEDULER] Log non enregistré (table optionnelle)');
    }
};

const capaciteController = {
    // Obtenir la capacité actuelle
    async getCapacite(req, res) {
        try {
            const userId = req.user.id;
            
            const query = `
                SELECT 
                    c.*,
                    d.nom as discotheque_nom
                FROM capacite c
                JOIN discotheques d ON c.discotheque_id = d.id
                WHERE c.user_id = $1
                ORDER BY c.id DESC
                LIMIT 1
            `;
            
            const result = await pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                // Si aucune capacité n'existe, créer une par défaut
                const createQuery = `
                    INSERT INTO capacite (discotheque_id, user_id, max, current, reset_schedule)
                    SELECT d.id, $1, 100, 0, '{}'::jsonb
                    FROM discotheques d
                    WHERE d.user_id = $1
                    LIMIT 1
                    RETURNING *
                `;
                const createResult = await pool.query(createQuery, [userId]);
                res.json(createResult.rows);
            } else {
                res.json(result.rows);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de la capacité:', error);
            res.status(500).json({ 
                error: 'Erreur lors de la récupération de la capacité',
                details: error.message 
            });
        }
    },

    // Créer ou mettre à jour la capacité
    async saveCapacite(req, res) {
        try {
            const userId = req.user.id;
            const { discotheque_id, max, current, reset_schedule } = req.body;

            // Vérifier si une capacité existe déjà
            const checkQuery = `
                SELECT id FROM capacite 
                WHERE discotheque_id = $1 AND user_id = $2
            `;
            const checkResult = await pool.query(checkQuery, [discotheque_id, userId]);

            let result;
            if (checkResult.rows.length > 0) {
                // Mise à jour
                const updateQuery = `
                    UPDATE capacite 
                    SET max = $1, 
                        current = $2, 
                        reset_schedule = $3,
                        last_reset = CURRENT_TIMESTAMP
                    WHERE discotheque_id = $4 AND user_id = $5
                    RETURNING *
                `;
                result = await pool.query(updateQuery, [
                    max, 
                    current, 
                    JSON.stringify(reset_schedule), 
                    discotheque_id, 
                    userId
                ]);
            } else {
                // Création
                const insertQuery = `
                    INSERT INTO capacite (discotheque_id, user_id, max, current, reset_schedule)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `;
                result = await pool.query(insertQuery, [
                    discotheque_id, 
                    userId, 
                    max, 
                    current, 
                    JSON.stringify(reset_schedule)
                ]);
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la capacité:', error);
            res.status(500).json({ 
                error: 'Erreur lors de la sauvegarde de la capacité',
                details: error.message 
            });
        }
    },

    // Mettre à jour uniquement le compteur
    async updateCount(req, res) {
        try {
            const userId = req.user.id;
            const { count } = req.body;

            const query = `
                UPDATE capacite 
                SET current = $1
                WHERE user_id = $2
                RETURNING *
            `;
            
            const result = await pool.query(query, [count, userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Capacité non trouvée' });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du compteur:', error);
            res.status(500).json({ 
                error: 'Erreur lors de la mise à jour du compteur',
                details: error.message 
            });
        }
    },

    // Réinitialiser le compteur
    async resetCount(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                UPDATE capacite 
                SET current = 0,
                    last_reset = CURRENT_TIMESTAMP
                WHERE user_id = $1
                RETURNING *
            `;
            
            const result = await pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Capacité non trouvée' });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la réinitialisation:', error);
            res.status(500).json({ 
                error: 'Erreur lors de la réinitialisation',
                details: error.message 
            });
        }
    },

    // Obtenir les statistiques de capacité
    async getStats(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    current,
                    max,
                    daily_peak,
                    last_reset,
                    ROUND((current::float / NULLIF(max, 0) * 100)::numeric, 2) as percentage
                FROM capacite
                WHERE user_id = $1
            `;
            
            const result = await pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Aucune statistique disponible' });
            }

            res.json({
                success: true,
                stats: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({ 
                error: 'Erreur lors de la récupération des statistiques',
                details: error.message 
            });
        }
    }
};

module.exports = {
    // Méthodes du contrôleur original
    ...capaciteController,
    // Nouvelles fonctions pour l'auto-reset
    startAutoResetScheduler,
    checkAndExecuteScheduledResets,
    executeAutoReset
};
