const pool = require('../db');

async function getReservations(req, res) {
    try {
        const result = await pool.query('SELECT * FROM reservations WHERE discotheque_id = $1', [req.query.discotheque_id || 1]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
    }
}

async function createReservation(req, res) {
    try {
        const { client_nom, client_email, date_reservation, nombre_personnes, discotheque_id } = req.body;
        const result = await pool.query(
            'INSERT INTO reservations (client_nom, client_email, date_reservation, nombre_personnes, discotheque_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [client_nom, client_email, date_reservation, nombre_personnes, discotheque_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la création de la réservation' });
    }
}

module.exports = { getReservations, createReservation };
