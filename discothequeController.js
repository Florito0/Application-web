const pool = require('../db');
const { initializeDefaultTaxes } = require('./taxeController');

// Met à jour OU crée le profil de la discothèque de l'utilisateur
const updateDiscotheque = async (req, res) => {
    const userId = req.user.id;
    const { nom, adresse, ville, telephone, email, cover_image_url } = req.body;

    if (!nom || !adresse) {
        return res.status(400).json({ error: 'Le nom et l\'adresse sont obligatoires.' });
    }

    try {
        // Vérifier si c'est une nouvelle discothèque
        const existingDisco = await pool.query(
            'SELECT id FROM public.discotheques WHERE user_id = $1',
            [userId]
        );
        const isNewDiscotheque = existingDisco.rows.length === 0;

        const result = await pool.query(
            `
                INSERT INTO public.discotheques (user_id, nom, adresse, ville, telephone, email, cover_image_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    nom = EXCLUDED.nom,
                    adresse = EXCLUDED.adresse,
                    ville = EXCLUDED.ville,
                    telephone = EXCLUDED.telephone,
                    email = EXCLUDED.email,
                    cover_image_url = EXCLUDED.cover_image_url
                RETURNING *
            `,
            [userId, nom, adresse, ville, telephone, email, cover_image_url]
        );
        
        // Initialiser les taxes de base seulement pour une nouvelle discothèque
        if (isNewDiscotheque) {
            await initializeDefaultTaxes(result.rows[0].id);
        }
        
        res.status(200).json(result.rows[0]);

    } catch (err) {
        console.error('[ERREUR updateDiscotheque]', err.message);
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
    }
};

// Le reste reste identique
const getDiscotheque = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'SELECT * FROM public.discotheques WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Aucun profil de discothèque trouvé.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[ERREUR getDiscotheque]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

module.exports = { getDiscotheque, updateDiscotheque };
