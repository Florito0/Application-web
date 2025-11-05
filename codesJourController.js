const db = require('../db');

class CodesJourController {

    async getMonthCodes(req, res) {
        const { year, month } = req.params;
        const userId = req.user.id;

        try {
            // ## MODIFICATION CI-DESSOUS ##
            // On utilise TO_CHAR pour formater la date directement en YYYY-MM-DD
            const result = await db.query(
                `SELECT TO_CHAR(date_code, 'YYYY-MM-DD') as date_code, code FROM codes_jour 
                 WHERE user_id = $1 
                 AND EXTRACT(YEAR FROM date_code) = $2 
                 AND EXTRACT(MONTH FROM date_code) = $3`,
                [userId, year, month]
            );

            const codes = {};
            result.rows.forEach(row => {
                codes[row.date_code] = row.code; // Maintenant, la clé correspond parfaitement
            });

            res.json({ codes });
        } catch (error) {
            console.error('Erreur getMonthCodes:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    // Sauvegarder un code unique pour l'utilisateur connecté
    async saveCode(req, res) {
        const { date, code } = req.body;
        const userId = req.user.id; // ID de l'utilisateur authentifié

        try {
            // La clause ON CONFLICT utilise maintenant (user_id, date_code)
            await db.query(
                `INSERT INTO codes_jour (user_id, date_code, code, created_at, updated_at) 
                 VALUES ($1, $2, $3, NOW(), NOW())
                 ON CONFLICT (user_id, date_code) 
                 DO UPDATE SET code = $3, updated_at = NOW()`,
                [userId, date, code]
            );
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Erreur saveCode:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async saveCode(req, res) {
        const { date, code } = req.body;
        const userId = req.user.id;
        try {
            await db.query(
                `INSERT INTO codes_jour (user_id, date_code, code) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, date_code) 
                 DO UPDATE SET code = $3, updated_at = NOW()`,
                [userId, date, code]
            );
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Erreur saveCode:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async saveBulkCodes(req, res) {
        const { codes } = req.body;
        const userId = req.user.id;
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            for (const [date, code] of Object.entries(codes)) {
                await client.query(
                    `INSERT INTO codes_jour (user_id, date_code, code) 
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id, date_code) 
                     DO UPDATE SET code = $3, updated_at = NOW()`,
                    [userId, date, code]
                );
            }
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur saveBulkCodes:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        } finally {
            client.release();
        }
    }
}

module.exports = new CodesJourController();
