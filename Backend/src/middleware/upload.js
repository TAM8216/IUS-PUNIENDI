const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { usuarioId, casoId } = req.body;
    const uploadPath = path.join(__dirname, "../uploads/usuarios", usuarioId, "casos", casoId);

    // Crear carpetas si no existen
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

module.exports = upload;
