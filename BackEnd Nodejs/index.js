const express = require('express');
const path = require('path');
const uploadRoutes = require('./api/routes/csvRoutes');
const cors = require('cors');

const app = express();

// Configuration de CORS
app.use(cors({
  origin: '*', // Autorise uniquement les requêtes venant de ce domaine
  methods: 'GET,POST,PUT,DELETE', // Méthodes autorisées
  allowedHeaders: 'Content-Type', // En-têtes autorisés
}));

// Route d'accueil simple
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

// Middleware pour gérer les données JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route d'upload
app.use('/api', uploadRoutes);

// Exporter l'application pour Vercel
module.exports = app;
