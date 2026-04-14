const pool = require("../db");

// 📋 LISTAR NOTIFICACIONES DE UN USUARIO
const listarNotificaciones = async (req, res, next) => {
  try {
    const { usuario_id } = req.params;
    console.log("🔍 Obteniendo notificaciones para usuario:", usuario_id);
    
    const result = await pool.query(
      `SELECT n.*, t.titulo as tarea_titulo
       FROM notificaciones n
       LEFT JOIN tareas t ON n.tarea_id = t.id
       WHERE n.usuario_id = $1
       ORDER BY n.fecha_creacion DESC
       LIMIT 100`,
      [usuario_id]
    );
    
    console.log(`✅ Notificaciones encontradas: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en listarNotificaciones:", error);
    next(error);
  }
};

// 📋 LISTAR NOTIFICACIONES NO LEÍDAS
const listarNotificacionesNoLeidas = async (req, res, next) => {
  try {
    const { usuario_id } = req.params;
    
    const result = await pool.query(
      `SELECT n.*, t.titulo as tarea_titulo
       FROM notificaciones n
       LEFT JOIN tareas t ON n.tarea_id = t.id
       WHERE n.usuario_id = $1 AND n.leida = false
       ORDER BY n.fecha_creacion DESC`,
      [usuario_id]
    );
    
    console.log(`✅ Notificaciones no leídas: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en listarNotificacionesNoLeidas:", error);
    next(error);
  }
};

// ➕ CREAR NOTIFICACIÓN
const crearNotificacion = async (req, res, next) => {
  try {
    const { tarea_id, usuario_id, mensaje, tipo } = req.body;

    console.log("📢 Creando notificación:", { tarea_id, usuario_id, tipo });

    const result = await pool.query(
      `INSERT INTO notificaciones (tarea_id, usuario_id, mensaje, tipo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tarea_id, usuario_id, mensaje, tipo || 'general']
    );

    const nuevaNotificacion = result.rows[0];
    console.log("✅ Notificación creada con ID:", nuevaNotificacion.id);

    res.status(201).json(nuevaNotificacion);
  } catch (error) {
    console.error("❌ Error en crearNotificacion:", error);
    next(error);
  }
};

// ✅ MARCAR NOTIFICACIÓN COMO LEÍDA
const marcarComoLeida = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notificaciones 
       SET leida = true 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Notificación no encontrada" });

    console.log("✅ Notificación marcada como leída:", id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error en marcarComoLeida:", error);
    next(error);
  }
};

// ✅ MARCAR TODAS COMO LEÍDAS
const marcarTodasComoLeidas = async (req, res, next) => {
  try {
    const { usuario_id } = req.params;

    const result = await pool.query(
      `UPDATE notificaciones 
       SET leida = true 
       WHERE usuario_id = $1 AND leida = false
       RETURNING *`,
      [usuario_id]
    );

    console.log(`✅ ${result.rowCount} notificaciones marcadas como leídas`);
    res.json({ 
      message: `${result.rowCount} notificaciones marcadas como leídas`,
      actualizadas: result.rowCount 
    });
  } catch (error) {
    console.error("❌ Error en marcarTodasComoLeidas:", error);
    next(error);
  }
};

// ❌ ELIMINAR NOTIFICACIÓN
const eliminarNotificacion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM notificaciones WHERE id = $1 RETURNING *", 
      [id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Notificación no encontrada" });

    console.log("✅ Notificación eliminada:", id);
    res.sendStatus(204);
  } catch (error) {
    console.error("❌ Error en eliminarNotificacion:", error);
    next(error);
  }
};

module.exports = {
  listarNotificaciones,
  listarNotificacionesNoLeidas,
  crearNotificacion,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion
};