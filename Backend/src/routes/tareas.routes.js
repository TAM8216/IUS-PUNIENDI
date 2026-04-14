const express = require('express');
const router = express.Router();
const {
  listarTareas,
  listarTodasTareas,
  crearTarea,
  editarTarea,
  eliminarTarea
} = require('../controllers/tareas.controller');
const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de usuarios
router.use(authenticateToken);

// 🔄 Todas las rutas de tareas
router.get('/', listarTodasTareas);              // GET /api/tareas (para calendario)
router.get('/usuario/:usuario_id', listarTareas); // GET /api/tareas/usuario/:id
router.post('/', crearTarea);                    // POST /api/tareas
router.put('/:id', editarTarea);                 // PUT /api/tareas/:id
router.delete('/:id', eliminarTarea);            // DELETE /api/tareas/:id

module.exports = router;