const express = require('express');
const router = express.Router();
const { listarJuzgados } = require('../controllers/juzgados.controller');

const authenticateToken = require('../middleware/auth');

// Aplicar autenticación
router.use(authenticateToken);

// GET /api/juzgados - Obtener lista de juzgados del Órgano Judicial
router.get('/', listarJuzgados);

module.exports = router;
