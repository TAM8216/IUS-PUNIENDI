const express = require('express');
const router = express.Router();
const {
  ListaUsuarios,
  Usuario,
  CrearUsuario,
  EditarUsuario,
  EliminarUsuario
} = require('../controllers/usuarios.controller');

const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas
router.use(authenticateToken);

// Rutas
router.get('/', ListaUsuarios);
router.get('/:id', Usuario);
router.post('/', CrearUsuario);
router.put('/:id', EditarUsuario);
router.delete('/:id', EliminarUsuario);

module.exports = router;