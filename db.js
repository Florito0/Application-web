const { Pool } = require('pg');
require('dotenv').config(); // Charge les variables du fichier .env

const pool = new Pool({
  // <-- MODIFIÉ : Utilise les bons noms de variables de votre fichier .env
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,       // <-- MODIFIÉ : J'utilise DB_NAME comme dans votre .env
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test de connexion (optionnel mais utile)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données :', err.stack);
  } else {
    console.log('✅ Connecté à la base de données PostgreSQL avec succès.');
  }
});

module.exports = pool;
