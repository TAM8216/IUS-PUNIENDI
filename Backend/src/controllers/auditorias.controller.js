// src/controllers/auditorias.controller.js
const pool = require('../db'); // debe existir src/db.js que exporte Pool

async function listarAuditorias(req, res, next) {
  try {
    const limit = Number(req.query.limit || 100);
    const { rows } = await pool.query('SELECT id, usuario_id, accion, detalle, fecha_hora FROM auditoria ORDER BY fecha_hora DESC LIMIT $1', [limit]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function obtenerAuditoria(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT id, usuario_id, accion, detalle, fecha_hora FROM auditoria WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Auditoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function registrarAuditoria({ usuario_id = null, accion = '', tabla_afectada = null, registro_id = null, descripcion = null, ip_origen = null }) {
  const detalle = JSON.stringify({ tabla_afectada, registro_id, descripcion, ip_origen });
  try {
    const { rows } = await pool.query('INSERT INTO auditoria (usuario_id, accion, detalle, fecha_hora) VALUES ($1,$2,$3,CURRENT_TIMESTAMP) RETURNING *', [usuario_id, accion, detalle]);
    return rows[0];
  } catch (err) {
    console.error('registrarAuditoria error:', err);
    return null;
  }
}

module.exports = {
  listarAuditorias,
  obtenerAuditoria,
  registrarAuditoria
};
