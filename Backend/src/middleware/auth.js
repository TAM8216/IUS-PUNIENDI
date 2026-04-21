const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // Verificar que JWT_SECRET esté configurado
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET no está configurado");
      return res.status(500).json({ 
        message: 'Error de configuración del servidor' 
      });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log("🔐 Headers recibidos:", req.headers);
    console.log("📦 Token recibido:", token ? `${token.substring(0, 20)}...` : 'No token');

    if (!token) {
      return res.status(401).json({ 
        message: 'Token de acceso requerido' 
      });
    }

    // Verificar token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log("❌ Error verificando token:", err.message);
        return res.status(403).json({ 
          message: 'Token inválido o expirado' 
        });
      }

      console.log("✅ Token válido. Usuario:", decoded);
      req.user = decoded;
      next();
    });

  } catch (error) {
    console.error("💥 Error en middleware auth:", error);
    res.status(500).json({ 
      message: 'Error interno del servidor en autenticación' 
    });
  }
};

module.exports = authenticateToken;