function getPaiements(req, res) {
    // Logique de gestion des paiements (à remplacer avec tes 1277 lignes)
    const paiements = [{ id: 1, montant: 10.00, date: new Date().toISOString() }]; // Exemple
    res.json({
        paiements,
        totalRecu: 10.00,
        message: 'Historique des paiements'
    });
}

module.exports = { getPaiements };
