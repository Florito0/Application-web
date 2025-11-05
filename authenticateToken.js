const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    console.log('🔐 [AUTH] Début de l\'authentification');
    const authHeader = req.headers['authorization'];
    console.log('🔐 [AUTH] En-tête Authorization:', authHeader);
    const token = authHeader && authHeader.split(' ')[1];
    console.log('🔐 [AUTH] Token reçu:', token ? 'Présent' : 'Absent');

    if (!token) {
        console.log('❌ [AUTH] Accès refusé - Token manquant');
        return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ [AUTH] Token invalide:', err.message);
            return res.status(403).json({ error: 'Token invalide ou expiré.' });
        }
        console.log('✅ [AUTH] Token valide pour utilisateur ID:', user.id);
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
