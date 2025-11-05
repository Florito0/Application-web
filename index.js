const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken'); // <-- AJOUTÉ : Indispensable pour vérifier le token
const session = require('express-session'); // <-- AJOUTÉ : Indispensable pour app.use(session(...))
const pool = require('./db'); // <-- AJOUTÉ : Indispensable pour vos routes
const authenticateToken = require('./middleware/authenticateToken');

dotenv.config();

const app = express();

const path = require('path'); // Ajoute ceci en haut si pas déjà présent

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middlewares de base
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET, // Utilise la variable d'environnement
  resave: false,
  saveUninitialized: true
}));

// Middleware de debug (très utile, gardez-le pour l'instant)
app.use((req, res, next) => {
  console.log('--- Debug Request ---');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('--- End Debug ---');
  next();
});


// Route de "santé" pour vérifier que le serveur tourne
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// --- Import de toutes vos routes ---
const entreesRoutes = require('./Routes/entrees');
const horairesRoutes = require('./Routes/horaires');
const codesJourRoutes = require('./Routes/codes-jour');
const capaciteRoutes = require('./Routes/capacite');
const ticketsRoutes = require('./routes/tickets');
const paiementsRoutes = require('./routes/paiements');
const vestiairesRoutes = require('./Routes/vestiaires');
const reservationsRoutes = require('./routes/reservations');
const statistiquesRoutes = require('./routes/statistiques');
const genreRoutes = require('./routes/genre');
const kiosqueRoutes = require('./routes/kiosque');
const discothequeRoutes = require('./routes/discotheque');
const authRoutes = require('./routes/authRoutes'); // Pour le login/création de token
const usersRoutes = require('./routes/usersRoutes');
const configurationRoutes = require('./routes/configuration');
const taxesRoutes = require('./routes/taxes');
const { startAutoResetScheduler } = require('./Controllers/capaciteController');

// --- Utilisation des routes ---

// Routes publiques (accessibles sans token)
app.use('/api/auth', authRoutes); // La route pour se connecter DOIT être publique
app.use('/api/entrees', authenticateToken, entreesRoutes);
app.use('/api/horaires', authenticateToken, horairesRoutes);
app.use('/api/codes-jour', authenticateToken, codesJourRoutes);
app.use('/api/capacite', authenticateToken, capaciteRoutes);
app.use('/api/tickets', authenticateToken, ticketsRoutes);
app.use('/api/paiements', authenticateToken, paiementsRoutes);
app.use('/api/vestiaires', authenticateToken, vestiairesRoutes);
app.use('/api/reservations', authenticateToken, reservationsRoutes);
app.use('/api/statistiques', authenticateToken, statistiquesRoutes);
app.use('/api/kiosque/genre', genreRoutes);
app.use('/api/kiosque', authenticateToken, kiosqueRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/configuration', authenticateToken, configurationRoutes);
app.use('/api/taxes', taxesRoutes);
app.use('/api/discotheques', authenticateToken, discothequeRoutes);

console.log('🚀 Démarrage du serveur...');
// Démarrage du serveur
// Démarrer le scheduler automatique
startAutoResetScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('🕐 Système de réinitialisation automatique actif');
    console.log('📊 Module de gestion des entrées activé')
});
