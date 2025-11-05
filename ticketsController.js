function getTickets(req, res) {
    // Logique de gestion des tickets (à remplacer avec tes 2361 lignes)
    const tickets = [{ id: 1, code: 'TICKET-001', valide: true }]; // Exemple
    res.json({
        tickets,
        nombreTotal: 1,
        message: 'Liste des tickets'
    });
}

module.exports = { getTickets };
