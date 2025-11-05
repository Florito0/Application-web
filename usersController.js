const pool = require('../db'); // Utilise le pool centralisé depuis db.js

const updateSubscription = async (req, res) => {
    const userId = req.user.id; // ID de l'utilisateur connecté via authenticateToken
    const { subscription_end_date, subscription_status } = req.body;

    // Validation de la date
    if (!subscription_end_date || new Date(subscription_end_date) <= new Date()) {
        return res.status(400).json({ error: 'Invalid subscription end date' });
    }

    // Validation de subscription_status (optionnel mais recommandé)
    const validStatuses = ['trialing', 'active', 'inactive'];
    if (subscription_status && !validStatuses.includes(subscription_status.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid subscription status' });
    }

    try {
        const result = await pool.query(
            'UPDATE public.users SET subscription_end_date = $1, subscription_status = $2 WHERE id = $3 RETURNING *',
            [subscription_end_date, subscription_status || 'active', userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Subscription updated', user: result.rows[0] });
    } catch (err) {
        console.error('Error updating subscription:', err.stack); // Log détaillé
        res.status(500).json({ error: 'Internal server error' }); // Message générique pour l'utilisateur
    }
};

module.exports = { updateSubscription };
