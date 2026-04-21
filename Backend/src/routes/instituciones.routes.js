const express = require('express');
const router = express.Router();
const {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  editarInstitucion,
  eliminarInstitucion
} = require('../controllers/instituciones.controller');

const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de usuarios
router.use(authenticateToken);

// 🔄 Todas las rutas de instituciones
router.get('/', listarInstituciones);           // GET /api/instituciones
router.get('/:id', obtenerInstitucion);         // GET /api/instituciones/:id
router.post('/', crearInstitucion);             // POST /api/instituciones
router.put('/:id', editarInstitucion);          // PUT /api/instituciones/:id
router.delete('/:id', eliminarInstitucion);     // DELETE /api/instituciones/:id

module.exports = router;