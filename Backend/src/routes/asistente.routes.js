const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  chat,
  resumirDocumento,
  resumirCaso,
  recomendarCaso,
  analizarDocumento,
  listarCasosUsuario
} = require('../controllers/asistente.controller');

const authenticateToken = require('../middleware/auth');

// Aplicar autenticación a todas las rutas del asistente
router.use(authenticateToken);

// Configurar multer para archivos temporales del asistente
const tempDir = path.join(__dirname, '..', 'uploads', 'asistente_temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFileName = uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, safeFileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos PDF, Word (.doc/.docx) y texto (.txt)'));
  }
});

// Middleware para manejar errores de multer
const uploadMiddleware = (req, res, next) => {
  upload.single('documento')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'El archivo excede el tamaño máximo de 15MB' });
      }
      return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// ── Rutas ──────────────────────────────────────────────────

// Chat legal libre
router.post('/chat', chat);

// Subir documento para resumir
router.post('/resumir-documento', uploadMiddleware, resumirDocumento);

// Resumir caso guardado (con sus documentos)
router.post('/resumir-caso/:casoId', resumirCaso);

// Dar recomendación para un caso guardado
router.post('/recomendar-caso/:casoId', recomendarCaso);

// Subir documento para analizar y dar recomendación
router.post('/analizar-documento', uploadMiddleware, analizarDocumento);

// Listar casos del usuario para selección en el asistente
router.get('/casos', listarCasosUsuario);

module.exports = router;
