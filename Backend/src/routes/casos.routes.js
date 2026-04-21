const { Router } = require("express");
const {
  ListaCasos,
  Caso,
  CrearCaso,
  EditarCaso,
  ActualizarSeguimiento,
  EliminarCaso,
  TrasladarCasos,
} = require("../controllers/casos.controller");

const router = Router();

// Todas las rutas requieren autenticación
const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de usuarios
router.use(authenticateToken);

// Listar todos los casos que puede ver el usuario
router.get("/", ListaCasos);

// Ver un caso específico (solo si tiene acceso)
router.get("/:id", Caso);

// Crear un nuevo caso (admin y abogado)
router.post("/", CrearCaso);

router.post("/traspasar", TrasladarCasos);

// Editar un caso
router.put("/:id", EditarCaso);
router.put("/:id/seguimiento", ActualizarSeguimiento);

// Eliminar un caso (solo superadmin o admin)
router.delete("/:id", EliminarCaso);

module.exports = router;
