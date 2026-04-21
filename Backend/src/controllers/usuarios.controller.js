const pool = require("../db");
const fs = require("fs");
const path = require("path");

// Listar usuarios
const ListaUsuarios = async (req, res) => {
  try {
    console.log("👤 Usuario haciendo request:", req.user);
    
    const queryText = `
      SELECT 
        u.id, 
        u.nombre, 
        u.apellido_paterno, 
        u.apellido_materno, 
        u.rpa, 
        u.contacto, 
        u.email, 
        u.rol, 
        u.estado,
        u.supervisor_id,
        s.nombre as supervisor_nombre,
        s.apellido_paterno as supervisor_apellido_paterno,
        s.apellido_materno as supervisor_apellido_materno
      FROM usuarios u
      LEFT JOIN usuarios s ON u.supervisor_id = s.id
      ORDER BY u.id DESC
    `;

    const result = await pool.query(queryText);
    
    // Formatear los datos para incluir el nombre completo del supervisor
    const usuariosConSupervisor = result.rows.map(usuario => ({
      ...usuario,
      supervisor_nombre_completo: usuario.supervisor_nombre 
        ? `${usuario.supervisor_nombre} ${usuario.supervisor_apellido_paterno || ''} ${usuario.supervisor_apellido_materno || ''}`.trim()
        : null
    }));
    
    console.log(`✅ ${req.user.email} obtuvo ${usuariosConSupervisor.length} usuarios`);
    
    res.json(usuariosConSupervisor);
  } catch (error) {
    console.error("❌ Error en ListaUsuarios:", error);
    res.status(500).json({ 
      message: 'Error al obtener usuarios',
      error: error.message 
    });
  }
};

// Obtener un usuario
const Usuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.nombre, 
        u.apellido_paterno, 
        u.apellido_materno, 
        u.ci, 
        u.rpa, 
        u.contacto, 
        u.email, 
        u.creado_en, 
        u.rol, 
        u.estado,
        u.supervisor_id,
        s.nombre as supervisor_nombre,
        s.apellido_paterno as supervisor_apellido_paterno,
        s.apellido_materno as supervisor_apellido_materno
      FROM usuarios u
      LEFT JOIN usuarios s ON u.supervisor_id = s.id
      WHERE u.id = $1;`,
      [id]
    );
    
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Usuario not found" });
    
    // Agregar nombre completo del supervisor
    const usuario = result.rows[0];
    const usuarioConSupervisor = {
      ...usuario,
      supervisor_nombre_completo: usuario.supervisor_nombre 
        ? `${usuario.supervisor_nombre} ${usuario.supervisor_apellido_paterno || ''} ${usuario.supervisor_apellido_materno || ''}`.trim()
        : null
    };
    
    res.json(usuarioConSupervisor);
  } catch (error) {
    next(error);
  }
};

// Crear usuario
const CrearUsuario = async (req, res, next) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      ci,
      rpa,
      contacto,
      email,
      creado_en,
      password,
      rol,
      estado,
      supervisor_id // 🔹 nuevo campo
    } = req.body;

    const result = await pool.query(
      `INSERT INTO usuarios 
        (nombre, apellido_paterno, apellido_materno, ci, rpa, contacto, email, creado_en, password, rol, estado, supervisor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, nombre, apellido_paterno, apellido_materno, email, rol, estado, supervisor_id;`,
      [nombre, apellido_paterno, apellido_materno, ci, rpa, contacto, email, creado_en, password, rol, estado || 'activo', supervisor_id || null]
    );

    const newUser = result.rows[0];

    // Crear carpeta del usuario y subcarpeta de casos
    const userFolder = path.join(__dirname, "..", "uploads", "usuarios", String(newUser.id));
    const casosFolder = path.join(userFolder, "casos");

    if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });
    if (!fs.existsSync(casosFolder)) fs.mkdirSync(casosFolder, { recursive: true });

    res.status(201).json(newUser);
   
  } catch (error) {
    next(error);
  }
};

// Editar usuario
const EditarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      ci,
      rpa,
      contacto,
      email,
      password,
      rol,
      estado,
      supervisor_id // 🔹 nuevo campo
    } = req.body;

    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre=$1, apellido_paterno=$2, apellido_materno=$3, ci=$4, rpa=$5, contacto=$6, email=$7, password=$8, rol=$9, estado=$10, supervisor_id=$11
       WHERE id=$12
       RETURNING id, nombre, apellido_paterno, apellido_materno, email, rol, estado, supervisor_id;`,
      [nombre, apellido_paterno, apellido_materno, ci, rpa, contacto, email, password, rol, estado, supervisor_id || null, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Usuario not found" });

    res.json(result.rows[0]);
    
  } catch (error) {
    next(error);
  }
};

// Eliminar usuario
const EliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM usuarios WHERE id=$1;", [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Usuario not found" });

    // Eliminar carpeta del usuario
    const userFolder = path.join(__dirname, "..", "uploads", "usuarios", String(id));
    if (fs.existsSync(userFolder)) fs.rmSync(userFolder, { recursive: true, force: true });

    res.sendStatus(204);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  ListaUsuarios,
  Usuario,
  CrearUsuario,
  EditarUsuario,
  EliminarUsuario,
};