const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  listarDocumentos,
  subirDocumento,
  eliminarDocumento
} = require('../controllers/documentos.controller');

const authenticateToken = require('../middleware/auth');

// 🔥 PRIMERO aplicar autenticación
router.use(authenticateToken);

// 🔥 LUEGO configurar multer (ahora req.user está disponible)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("📁 Configurando destino para upload...");
    console.log("👤 User ID:", req.user?.id);
    console.log("📂 Caso ID:", req.params.caso_id);
    
    // Verificar que req.user existe después de la autenticación
    if (!req.user || !req.user.id) {
      console.log("❌ ERROR: req.user no disponible en multer");
      return cb(new Error('Usuario no autenticado'));
    }

    const userFolder = path.join(
      __dirname, 
      '..', 
      'uploads', 
      'usuarios', 
      String(req.user.id), 
      'casos', 
      String(req.params.caso_id)
    );
    
    console.log("📍 Carpeta destino:", userFolder);
    
    // Crear directorio si no existe
    const fs = require('fs');
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
      console.log("📁 Carpeta creada:", userFolder);
    }
    
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFileName = uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    console.log("📄 Nombre de archivo:", safeFileName);
    cb(null, safeFileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 Filtrando archivo:", file.originalname);
    
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      console.log("✅ Archivo aceptado:", file.originalname);
      return cb(null, true);
    } else {
      console.log("❌ Archivo rechazado:", file.originalname);
      cb(new Error('Solo se permiten archivos PDF, Word, imágenes y texto'));
    }
  }
});

// 🔥 Manejo de errores de multer
const uploadMiddleware = (req, res, next) => {
  upload.single('documento')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("❌ Error de Multer:", err);
      return res.status(400).json({ 
        message: `Error al subir archivo: ${err.message}` 
      });
    } else if (err) {
      console.error("❌ Error en fileFilter:", err);
      return res.status(400).json({ 
        message: err.message 
      });
    }
    
    console.log("✅ Multer completado, archivo:", req.file);
    next();
  });
};

// Rutas de documentos
router.get('/casos/:caso_id', listarDocumentos);
router.post('/casos/:caso_id', uploadMiddleware, subirDocumento); // 🔥 Usar el middleware personalizado
router.delete('/:id', eliminarDocumento);

// Ruta de prueba
router.get('/test', (req, res) => {
  console.log("✅ Ruta de prueba - User:", req.user);
  res.json({ 
    message: 'Rutas de documentos funcionando!',
    user: req.user 
  });
});

module.exports = router;