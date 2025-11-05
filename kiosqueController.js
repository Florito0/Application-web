const pool = require('../db');
const { getHorairesData } = require('./horairesController');

async function createKiosqueInteraction(req, res) {
    try {
        const { genre_id, discotheque_id } = req.body;
        const { isHeureCreuse } = getHorairesData();
        const tarif = isHeureCreuse ? 5.00 : 10.00;

        // Créer une entrée
        const entreeResult = await pool.query(
            'INSERT INTO entrees (tarif, genre, is_heure_creuse, discotheque_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [tarif, (await pool.query('SELECT nom FROM genres WHERE id = $1', [genre_id])).rows[0]?.nom, isHeureCreuse, discotheque_id || 1]
        );
        const entree_id = entreeResult.rows[0].id;

        // Créer une interaction kiosque
        const interactionResult = await pool.query(
            'INSERT INTO kiosque_interactions (discotheque_id, genre_id, entree_id) VALUES ($1, $2, $3) RETURNING *',
            [discotheque_id || 1, genre_id, entree_id]
        );

        res.status(201).json(interactionResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'interaction kiosque' });
    }
}

async function assignVestiaireToInteraction(req, res) {
    try {
        const { interaction_id, numero_vestiaire, discotheque_id } = req.body;
        const interaction = await pool.query('SELECT entree_id FROM kiosque_interactions WHERE id = $1', [interaction_id]);
        if (interaction.rows.length === 0) {
            return res.status(404).json({ error: 'Interaction non trouvée' });
        }

        const vestiaireResult = await pool.query(
            'INSERT INTO vestiaires (numero_vestiaire, statut, entree_id, discotheque_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [numero_vestiaire, 'occupé', interaction.rows[0].entree_id, discotheque_id || 1]
        );

        const updateInteraction = await pool.query(
            'UPDATE kiosque_interactions SET vestiaire_id = $1 WHERE id = $2 RETURNING *',
            [vestiaireResult.rows[0].id, interaction_id]
        );

        res.json(updateInteraction.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de l\'assignation du vestiaire' });
    }
}

async function getKiosqueInteractions(req, res) {
    try {
        const result = await pool.query(
            'SELECT ki.*, g.nom as genre, e.tarif, v.numero_vestiaire FROM kiosque_interactions ki ' +
            'LEFT JOIN genres g ON ki.genre_id = g.id ' +
            'LEFT JOIN entrees e ON ki.entree_id = e.id ' +
            'LEFT JOIN vestiaires v ON ki.vestiaire_id = v.id ' +
            'WHERE ki.discotheque_id = $1',
            [req.query.discotheque_id || 1]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la récupération des interactions kiosque' });
    }
}

module.exports = { createKiosqueInteraction, assignVestiaireToInteraction, getKiosqueInteractions };
