const pool = require('../db');

// Récupère la configuration de la discothèque de l'utilisateur
const getConfiguration = async (req, res) => {
    try {
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée pour cet utilisateur.' });
        }
        const discothequeId = discoRes.rows[0].id;

        const configRes = await pool.query('SELECT * FROM configurations WHERE discotheque_id = $1', [discothequeId]);
        
        if (configRes.rows.length === 0) {
            // Si aucune config n'existe, on renvoie les valeurs par défaut
            return res.json({ 
                kiosque_alerts: {},
                alerts_config: {
                    1: { enabled: true, percentage: 80, color: '#00f708' },
                    2: { enabled: true, percentage: 90, color: '#ff5722' },
                    3: { enabled: true, percentage: 95, color: '#ff1100' }
                }
            });
        }

        // Assurer que alerts_config existe même s'il est null/undefined
        const config = configRes.rows[0];
        if (!config.alerts_config) {
            config.alerts_config = {
                1: { enabled: true, percentage: 80, color: '#00f708' },
                2: { enabled: true, percentage: 90, color: '#ff5722' },
                3: { enabled: true, percentage: 95, color: '#ff1100' }
            };
        }

        res.json(config);
    } catch (err) {
        console.error('[ERREUR getConfiguration]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Met à jour ou crée la configuration
const updateConfiguration = async (req, res) => {
    const { kiosque_alerts, alerts_config } = req.body;

    try {
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée pour cet utilisateur.' });
        }
        const discothequeId = discoRes.rows[0].id;

        // Préparer les données à mettre à jour
        let updateData = {};
        let updateFields = [];
        let updateValues = [discothequeId];
        let valueIndex = 2;

        if (kiosque_alerts !== undefined) {
            updateFields.push(`kiosque_alerts = $${valueIndex}`);
            updateValues.push(kiosque_alerts);
            updateData.kiosque_alerts = kiosque_alerts;
            valueIndex++;
        }

        if (alerts_config !== undefined) {
    updateFields.push(`alerts_config = $${valueIndex}`);
    updateValues.push(JSON.stringify(alerts_config));
    updateData.alerts_config = alerts_config;
    valueIndex++;
}

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        // Ajouter updated_at
        updateFields.push(`updated_at = NOW()`);

        const query = `
            INSERT INTO configurations (discotheque_id, ${Object.keys(updateData).join(', ')}, updated_at)
            VALUES ($1, ${updateFields.map((_, i) => `$${i + 2}`).slice(0, Object.keys(updateData).length).join(', ')}, NOW())
            ON CONFLICT (discotheque_id)
            DO UPDATE SET ${updateFields.join(', ')}
            RETURNING *
        `;

        const result = await pool.query(query, updateValues);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('[ERREUR updateConfiguration]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const getTaxAssignments = async (req, res) => {
    try {
        console.log('🔍 getTaxAssignments appelé pour user:', req.user.id);
        
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée.' });
        }
        
        const discothequeId = discoRes.rows[0].id;
        console.log('🏢 Discothèque ID:', discothequeId);
        
        // 🔗 Jointure avec la table taxes pour avoir le nom et taux
        const assignmentsRes = await pool.query(`
            SELECT ta.*, t.nom as taxe_name, t.taux 
            FROM taxe_assignments ta
            LEFT JOIN taxes t ON ta.taxe_id = t.id  
            WHERE ta.discotheque_id = $1
        `, [discothequeId]);
        
        console.log('💾 Assignations trouvées:', assignmentsRes.rows);
        res.json(assignmentsRes.rows);
        
    } catch (err) {
        console.error('❌ Erreur getTaxAssignments:', err.message);
        res.status(500).json({ error: err.message });
    }
};

const saveTaxAssignments = async (req, res) => {
    const { assignments } = req.body; // ex: [{ item_name: "Vestiaire", taxe_id: 3 }]
    const client = await pool.connect();
    try {
        const discoRes = await client.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) return res.status(404).json({ error: 'Discothèque non trouvée.' });
        const discothequeId = discoRes.rows[0].id;

        await client.query('BEGIN'); // Démarre une transaction

        for (const assign of assignments) {
            await client.query(
                `INSERT INTO taxe_assignments (discotheque_id, item_name, taxe_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (discotheque_id, item_name)
                 DO UPDATE SET taxe_id = $3`,
                [discothequeId, assign.item_name, assign.taxe_id]
            );
        }

        await client.query('COMMIT'); // Valide les changements
        res.json({ success: true, message: 'Assignations sauvegardées' });
    } catch (err) {
        await client.query('ROLLBACK'); // Annule en cas d'erreur
        console.error('[ERREUR saveTaxAssignments]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
};

// Exportez aussi cette fonction
module.exports = { getConfiguration, updateConfiguration, getTaxAssignments, saveTaxAssignments };
