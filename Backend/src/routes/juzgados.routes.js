const express = require('express');
const router = express.Router();
const { listarJuzgados } = require('../controllers/juzgados.controller');

// GET /api/juzgados - Obtener lista de juzgados del Órgano Judicial
// No requiere autenticación: los datos son públicos del sitio oficial del Órgano Judicial
router.get('/', listarJuzgados);

module.exports = router;