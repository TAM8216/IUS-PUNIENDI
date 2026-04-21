const express = require('express');
const router = express.Router();
const {
  listarNotificaciones,
  listarNotificacionesNoLeidas,
  crearNotificacion,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion
} = require('../controllers/notificaciones.controller');


const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de clientes
router.use(authenticateToken);

// 🔄 Todas las rutas de notificaciones
router.get('/usuario/:usuario_id', listarNotificaciones);
router.get('/usuario/:usuario_id/no-leidas', listarNotificacionesNoLeidas);
router.post('/', crearNotificacion);
router.put('/:id/leer', marcarComoLeida);
router.put('/usuario/:usuario_id/leer-todas', marcarTodasComoLeidas);
router.delete('/:id', eliminarNotificacion);

module.exports = router;