const pool = require("../db");

// 📋 LISTAR ACCIONES DE UN USUARIO (con nurej_cud del caso)
const listarAccionesPorUsuario = async (req, res, next) => {
  try {
    const { usuario_id } = req.params;
    console.log("🔍 Obteniendo acciones del usuario:", usuario_id);

    const result = await pool.query(
      `SELECT a.id, a.usuario_id, a.caso_id, 
              c.nurej_cud, 
              a.titulo, a.descripcion, 
              a.fecha_inicio, a.fecha_fin,
              a.hora_inicio, a.hora_vencimiento, 
              a.todo_el_dia, a.estado
       FROM acciones a
       LEFT JOIN casos c ON a.caso_id = c.id
       WHERE a.usuario_id = $1
       ORDER BY a.fecha_inicio DESC, a.hora_inicio DESC`,
      [usuario_id]
    );

    console.log(`✅ Acciones encontradas: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en listarAccionesPorUsuario:", error);
    next(error);
  }
};

// 📋 LISTAR ACCIONES POR CASO
const listarAccionesPorCaso = async (req, res, next) => {
  try {
    const { caso_id } = req.params;
    console.log("🔍 Obteniendo acciones para caso ID:", caso_id);

    const result = await pool.query(
      `SELECT a.id, a.usuario_id, a.caso_id, 
              c.nurej_cud, 
              a.titulo, a.descripcion, 
              a.fecha_inicio, a.fecha_fin,
              a.hora_inicio, a.hora_vencimiento, 
              a.todo_el_dia, a.estado
       FROM acciones a
       LEFT JOIN casos c ON a.caso_id = c.id
       WHERE a.caso_id = $1
       ORDER BY a.fecha_inicio DESC, a.hora_inicio DESC`,
      [caso_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en listarAccionesPorCaso:", error);
    next(error);
  }
};

// ➕ CREAR ACCIÓN (normal o por caso)
const crearAccion = async (req, res, next) => {
  try {
    const { 
      usuario_id, 
      caso_id,
      titulo, 
      descripcion, 
      fecha_inicio, 
      fecha_fin,
      hora_inicio,
      hora_vencimiento,
      todo_el_dia,
      estado 
    } = req.body;

    console.log("📝 Creando acción:", { titulo, caso_id, usuario_id });

    if (!titulo || !fecha_inicio) {
      return res.status(400).json({ message: "El título y la fecha son requeridos" });
    }

    const horaInicioFinal = todo_el_dia ? null : hora_inicio;
    const horaVencimientoFinal = todo_el_dia ? null : hora_vencimiento;

    const result = await pool.query(
      `INSERT INTO acciones (
        usuario_id, caso_id, titulo, descripcion,
        fecha_inicio, fecha_fin,
        hora_inicio, hora_vencimiento, todo_el_dia, estado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        usuario_id || 1,
        caso_id || null,
        titulo,
        descripcion || "",
        fecha_inicio,
        fecha_fin || fecha_inicio,
        horaInicioFinal,
        horaVencimientoFinal,
        todo_el_dia !== undefined ? todo_el_dia : true,
        estado || "pendiente"
      ]
    );

    const nuevaAccion = result.rows[0];
    console.log("✅ Acción creada con ID:", nuevaAccion.id);
    res.status(201).json(nuevaAccion);
  } catch (error) {
    console.error("❌ Error en crearAccion:", error);
    next(error);
  }
};

// ✏️ EDITAR ACCIÓN
const editarAccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      descripcion, 
      fecha_inicio, 
      fecha_fin,
      hora_inicio,
      hora_vencimiento,
      todo_el_dia,
      estado 
    } = req.body;

    const horaInicioFinal = todo_el_dia ? null : hora_inicio;
    const horaVencimientoFinal = todo_el_dia ? null : hora_vencimiento;

    const result = await pool.query(
      `UPDATE acciones
       SET titulo = $1,
           descripcion = $2,
           fecha_inicio = $3,
           fecha_fin = $4,
           hora_inicio = $5,
           hora_vencimiento = $6,
           todo_el_dia = $7,
           estado = $8
       WHERE id = $9
       RETURNING *`,
      [
        titulo,
        descripcion,
        fecha_inicio,
        fecha_fin || fecha_inicio,
        horaInicioFinal,
        horaVencimientoFinal,
        todo_el_dia !== undefined ? todo_el_dia : true,
        estado,
        id
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Acción no encontrada" });

    console.log("✅ Acción actualizada:", id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error en editarAccion:", error);
    next(error);
  }
};

// ❌ ELIMINAR ACCIÓN
const eliminarAccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Eliminando acción ID:", id);

    const result = await pool.query("DELETE FROM acciones WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Acción no encontrada" });

    console.log("✅ Acción eliminada ID:", id);
    res.sendStatus(204);
  } catch (error) {
    console.error("❌ Error en eliminarAccion:", error);
    next(error);
  }
};

module.exports = {
  listarAccionesPorUsuario,
  listarAccionesPorCaso,
  crearAccion,
  editarAccion,
  eliminarAccion
};
