// src/controllers/auth.controller.js
const pool = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const JWT_SECRET = process.env.JWT_SECRET || "secret_dev_change_me";

// Login: recibe email y password, devuelve JWT
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email y password son obligatorios" });

    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: "Usuario no encontrado" });

    // Comparar password (asumiendo que está en texto plano o hasheado)
    const passwordValid = user.password === password || await bcrypt.compare(password, user.password);
    if (!passwordValid) return res.status(401).json({ message: "Password incorrecto" });

    // Generar token
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, rol: user.rol },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Error interno al iniciar sesión" });
  }
}
async function verifyToken(req, res) {
  try {
    // El token viene en el header Authorization: Bearer <token>
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const result = await pool.query("SELECT id, nombre, email, rol FROM usuarios WHERE id=$1", [decoded.id]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    res.json({ 
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error("Verify token error:", err);
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// Y exporta la función
module.exports = { login, verifyToken };