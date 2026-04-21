const express = require('express');
const router = express.Router();
const {
  listarAccionesPorUsuario,
  listarAccionesPorCaso,
  crearAccion,
  editarAccion,
  eliminarAccion
} = require('../controllers/acciones.controller');
const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de usuarios
router.use(authenticateToken);

// 🔄 Todas las rutas de tareas
router.get('/usuario/:usuario_id', listarAccionesPorUsuario); // GET /api/acciones/usuario/:id
router.get('/caso/:caso_id', listarAccionesPorCaso); // GET /api/acciones/caso/:id
router.post('/', crearAccion);                    // POST /api/acciones
router.put('/:id', editarAccion);                 // PUT /api/acciones/:id
router.delete('/:id', eliminarAccion);            // DELETE /api/acciones/:id

module.exports = router;