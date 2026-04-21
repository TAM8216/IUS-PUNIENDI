// src/routes/auditoria.routes.js
const { Router } = require('express');
const router = Router();

const auth = require('../middleware/auth');         // debe exportar function
const authorize = require('../middleware/authorize'); // debe exportar factory function
const auditoriasCtrl = require('../controllers/auditorias.controller');

console.log('DEBUG auditoria.routes -> types:', {
  auth: typeof auth,
  authorize: typeof authorize,
  listarAuditorias: typeof auditoriasCtrl.listarAuditorias,
  obtenerAuditoria: typeof auditoriasCtrl.obtenerAuditoria
});

// Protege todas las rutas
if (typeof auth === 'function') {
  router.use(auth);
} else {
  console.error('auth middleware is not a function. Check src/middleware/auth.js');
  // fallback: block requests
  router.use((req, res, next) => res.status(500).json({ message: 'Auth middleware misconfigured' }));
}

// Ruta: listar auditorías (requiere rol)
const listHandler = auditoriasCtrl.listarAuditorias;
const getHandler = auditoriasCtrl.obtenerAuditoria;

if (typeof authorize === 'function' && typeof listHandler === 'function') {
  router.get('/', authorize(['superadmin', 'admin']), listHandler);
} else if (typeof listHandler === 'function') {
  console.warn('authorize middleware not available, mounting listarAuditorias without role check');
  router.get('/', listHandler);
} else {
  console.error('listarAuditorias handler missing; route not mounted');
}

// Ruta: obtener por id
if (typeof authorize === 'function' && typeof getHandler === 'function') {
  router.get('/:id', authorize(['superadmin', 'admin']), getHandler);
} else if (typeof getHandler === 'function') {
  router.get('/:id', getHandler);
} else {
  console.error('obtenerAuditoria handler missing; route not mounted');
}

module.exports = router;
