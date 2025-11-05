const express = require('express');
const router = express.Router();
const { getCapacite, saveCapacite, updateCount, resetCount, getStats } = require('../Controllers/capaciteController');

router.get('/', getCapacite);
router.post('/', saveCapacite);
router.patch('/count', updateCount);
router.patch('/reset', resetCount);
router.get('/stats', getStats);

// NOUVELLE ROUTE pour la vérification automatique
router.post('/check-auto-reset', async (req, res) => {
    try {
        const userId = req.user.id;
        const { force = false } = req.body;
        
        if (force) {
            // Importer la fonction depuis le contrôleur
            const { checkAndExecuteScheduledResets } = require('../Controllers/capaciteController');
            await checkAndExecuteScheduledResets();
        }
        
        // Récupérer les prochaines réinitialisations programmées
        const pool = require('../db');
        const query = `
            SELECT reset_schedule 
            FROM capacite 
            WHERE user_id = $1 AND is_active = true
            LIMIT 1
        `;
        
        const result = await pool.query(query, [userId]);
        
        let upcomingResets = [];
        if (result.rows.length > 0) {
            const schedule = result.rows[0].reset_schedule;
            const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
            
            days.forEach(day => {
                if (schedule[day] && schedule[day] !== 'Désactivé') {
                    upcomingResets.push({
                        day: day,
                        time: schedule[day]
                    });
                }
            });
        }
        
        res.json({
            success: true,
            upcomingResets
        });
    } catch (error) {
        console.error('Erreur check auto-reset:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
});

module.exports = router;
