const express = require('express');
const router = express.Router();
const {
  ListaClientes,
  Cliente,
  CrearCliente,
  EditarCliente,
  EliminarCliente
} = require('../controllers/clientes.controller');

const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de clientes
router.use(authenticateToken);

// Rutas de clientes
router.get('/', ListaClientes);
router.get('/:id', Cliente);
router.post('/', CrearCliente);
router.put('/:id', EditarCliente);
router.delete('/:id', EliminarCliente);

module.exports = router;