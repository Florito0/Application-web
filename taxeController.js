const pool = require('../db');

// Fonction pour initialiser les taux de base lors de la création d'une discothèque
const initializeDefaultTaxes = async (discothequeId) => {
const defaultTaxes = [
    { nom: 'TVA 5.5%', taux: 5.5 },
    { nom: 'TVA 10%', taux: 10.0 },
    { nom: 'TVA 20%', taux: 20.0 }
];

    try {
        for (const taxe of defaultTaxes) {
            await pool.query(
                'INSERT INTO taxes (discotheque_id, nom, taux) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [discothequeId, taxe.nom, taxe.taux]
            );
        }
        console.log(`Taxes par défaut initialisées pour la discothèque ${discothequeId}`);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des taxes par défaut:', error);
    }
};

// Récupère toutes les taxes pour une discothèque
const getTaxes = async (req, res) => {
    try {
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée.' });
        }
        
        const discothequeId = discoRes.rows[0].id;
        
        const taxesRes = await pool.query('SELECT id, nom, taux FROM taxes WHERE discotheque_id = $1 ORDER BY taux', [discothequeId]);
        
        // 🆕 FORMATAGE DE L'AFFICHAGE
        const taxesFormatted = taxesRes.rows.map(tax => ({
            id: tax.id,
            nom: tax.nom,
            taux: parseFloat(tax.taux),
            // 🎯 AFFICHAGE PROPRE : TVA 5.5% ou TVA 10%
            displayName: `TVA ${parseFloat(tax.taux) % 1 === 0 ? Math.round(parseFloat(tax.taux)) : parseFloat(tax.taux)}%`
        }));
        
        res.json(taxesFormatted);
    } catch (error) {
        console.error('[ERREUR getTaxes]', error.message, error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Ajouter une nouvelle taxe
const addTaxe = async (req, res) => {
    const { nom, taux } = req.body;
    
    try {
        console.log('=== DEBUG addTaxe ===');
        console.log('req.user:', req.user);
        console.log('req.body:', { nom, taux, type: typeof taux });
        console.log('====================');
        
        if (!req.user || !req.user.id) {
            console.error('req.user manquant ou invalide');
            return res.status(401).json({ error: 'Utilisateur non authentifié' });
        }
        
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée.' });
        }
        const discothequeId = discoRes.rows[0].id;

        const tauxNumber = parseFloat(taux);

        // 🔧 VÉRIFICATION ROBUSTE avec CAST
        const existingTax = await pool.query(
            'SELECT id, nom, taux FROM taxes WHERE discotheque_id = $1 AND CAST(taux AS DECIMAL) = CAST($2 AS DECIMAL)',
            [discothequeId, tauxNumber]
        );
        
        console.log('🔍 Taxes existantes trouvées:', existingTax.rows);
        
        if (existingTax.rows.length > 0) {
            console.log('❌ Taxe déjà existante:', existingTax.rows[0]);
            return res.status(409).json({ 
                error: 'Ce taux de TVA existe déjà.',
                existing: existingTax.rows[0]
            });
        }

        const result = await pool.query(
            'INSERT INTO taxes (discotheque_id, nom, taux) VALUES ($1, $2, $3) RETURNING *',
            [discothequeId, nom, tauxNumber]
        );
        
        console.log('✅ Taxe ajoutée:', result.rows[0]);
        res.status(201).json(result.rows[0]);
        
    } catch (err) {
        console.error('[ERREUR addTaxe]', err.message);
        
        // 🔧 GESTION CONTRAINTE D'UNICITÉ
        if (err.code === '23505') {
            console.log('🔍 Contrainte violée:', err.constraint);
            return res.status(409).json({ 
                error: 'Ce taux de TVA existe déjà.',
                detail: 'Cette valeur est déjà présente dans votre système.'
            });
        }
        
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Vérifier si une taxe est utilisée
const isTaxeUsed = async (taxeId, discothequeId) => {
    try {
        // Vérifier dans les entrées
        const entreesResult = await pool.query(
            'SELECT COUNT(*) FROM entrees WHERE taxe_id = $1',
            [taxeId]
        );
        
        // Vérifier dans les vestiaires
        const vestiairesResult = await pool.query(
            'SELECT COUNT(*) FROM vestiaires WHERE taxe_id = $1',
            [taxeId]
        );
        
        // Vérifier dans les types de tickets
        const ticketsResult = await pool.query(
            'SELECT COUNT(*) FROM types_tickets WHERE taxe_id = $1',
            [taxeId]
        );
        
        const totalUsage = parseInt(entreesResult.rows[0].count) + 
                          parseInt(vestiairesResult.rows[0].count) + 
                          parseInt(ticketsResult.rows[0].count);
        
        return totalUsage > 0;
    } catch (error) {
        console.error('Erreur lors de la vérification d\'usage de la taxe:', error);
        return false;
    }
};

// Supprimer une taxe
const deleteTaxe = async (req, res) => {
    const taxeId = req.params.id;
    
    try {
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée.' });
        }
        const discothequeId = discoRes.rows[0].id;

        // Vérifier si la taxe est utilisée
        const isUsed = await isTaxeUsed(taxeId, discothequeId);
        if (isUsed) {
            return res.status(400).json({ 
                error: 'Cette taxe ne peut pas être supprimée car elle est utilisée dans des tickets, entrées ou vestiaires.' 
            });
        }

        // Vérifier que la taxe appartient bien à cette discothèque
        const taxeCheck = await pool.query(
            'SELECT id FROM taxes WHERE id = $1 AND discotheque_id = $2',
            [taxeId, discothequeId]
        );
        
        if (taxeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Taxe non trouvée.' });
        }

        await pool.query('DELETE FROM taxes WHERE id = $1', [taxeId]);
        res.json({ message: 'Taxe supprimée avec succès' });
    } catch (err) {
        console.error('[ERREUR deleteTaxe]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Mettre à jour une taxe
const updateTaxe = async (req, res) => {
    const taxeId = req.params.id;
    const { taux } = req.body; // On ne modifie que le taux
    
    try {
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée.' });
        }
        const discothequeId = discoRes.rows[0].id;

        // Vérifier que le nouveau taux n'existe pas déjà
        const existingTax = await pool.query(
            'SELECT id FROM taxes WHERE discotheque_id = $1 AND taux = $2 AND id != $3',
            [discothequeId, taux, taxeId]
        );
        
        if (existingTax.rows.length > 0) {
            return res.status(409).json({ error: 'Ce taux de TVA existe déjà.' });
        }

        const result = await pool.query(
            'UPDATE taxes SET taux = $1 WHERE id = $2 AND discotheque_id = $3 RETURNING *',
            [taux, taxeId, discothequeId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Taxe non trouvée.' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[ERREUR updateTaxe]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const checkTaxeUsage = async (req, res) => {
    const taxeId = req.params.id;
    
    try {
        const discoRes = await pool.query('SELECT id FROM discotheques WHERE user_id = $1', [req.user.id]);
        if (discoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Discothèque non trouvée.' });
        }
        const discothequeId = discoRes.rows[0].id;

        const isUsed = await isTaxeUsed(taxeId, discothequeId);
        res.json({ isUsed });
    } catch (err) {
        console.error('[ERREUR checkTaxeUsage]', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Modifiez votre export
module.exports = { 
    getTaxes, 
    addTaxe, 
    deleteTaxe, 
    updateTaxe, 
    initializeDefaultTaxes,
    isTaxeUsed: checkTaxeUsage
};
