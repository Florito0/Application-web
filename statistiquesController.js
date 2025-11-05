const pool = require('../db');

async function getStatistiques(req, res) {
    try {
        const { date_debut, date_fin, discotheque_id } = req.query;
        const query = `
            SELECT 
                DATE(e.date) as date_stat,
                COUNT(e.id) as total_entrees,
                SUM(e.tarif) as total_revenus,
                (COUNT(e.id)::FLOAT / c.max) * 100 as taux_occupation
            FROM entrees e
            JOIN capacite c ON e.discotheque_id = c.discotheque_id
            WHERE e.discotheque_id = $1
            AND e.date BETWEEN $2 AND $3
            GROUP BY DATE(e.date), c.max
        `;
        const result = await pool.query(query, [discotheque_id || 1, date_debut || '2025-01-01', date_fin || '2025-12-31']);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
}

module.exports = { getStatistiques };
