const pool = require("../db");

// 📋 LISTAR TAREAS DE UN USUARIO
const listarTareas = async (req, res, next) => {
  try {
    const { usuario_id } = req.params;
    console.log("🔍 Obteniendo tareas para usuario:", usuario_id);
    
    const result = await pool.query(
      `SELECT id, usuario_id, titulo, descripcion, 
              fecha_inicio, fecha_vencimiento,
              hora_inicio, hora_vencimiento, todo_el_dia,
              estado
       FROM tareas 
       WHERE usuario_id = $1
       ORDER BY fecha_inicio DESC, hora_inicio DESC`,
      [usuario_id]
    );
    
    console.log(`✅ Tareas encontradas: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en listarTareas:", error);
    next(error);
  }
};

// 📋 LISTAR TODAS LAS TAREAS (para el calendario)
const listarTodasTareas = async (req, res, next) => {
  try {
    console.log("🔍 Obteniendo todas las tareas...");
    
    const result = await pool.query(
      `SELECT id, usuario_id, titulo, descripcion, 
              fecha_inicio, fecha_vencimiento,
              hora_inicio, hora_vencimiento, todo_el_dia,
              estado
       FROM tareas 
       ORDER BY fecha_inicio DESC, hora_inicio DESC`
    );
    
    console.log(`✅ Total tareas encontradas: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en listarTodasTareas:", error);
    next(error);
  }
};

// ➕ CREAR TAREA (ACTUALIZADO)
const crearTarea = async (req, res, next) => {
  try {
    const { 
      usuario_id, 
      titulo, 
      descripcion, 
      fecha_inicio, 
      fecha_vencimiento,
      hora_inicio,
      hora_vencimiento,
      todo_el_dia,
      estado 
    } = req.body;

    console.log("📝 Creando nueva tarea:", { titulo, fecha_inicio, usuario_id });

    // Validaciones
    if (!titulo || !fecha_inicio) {
      return res.status(400).json({ message: "El título y la fecha son requeridos" });
    }

    // Si es todo el día, establecer horas como null
    const horaInicioFinal = todo_el_dia ? null : hora_inicio;
    const horaVencimientoFinal = todo_el_dia ? null : hora_vencimiento;

    const result = await pool.query(
      `INSERT INTO tareas (
        usuario_id, titulo, descripcion, 
        fecha_inicio, fecha_vencimiento,
        hora_inicio, hora_vencimiento, todo_el_dia,
        estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        usuario_id || 1,
        titulo, 
        descripcion || '', 
        fecha_inicio, 
        fecha_vencimiento || fecha_inicio,
        horaInicioFinal,
        horaVencimientoFinal,
        todo_el_dia !== undefined ? todo_el_dia : true,
        estado || 'pendiente'
      ]
    );

    const nuevaTarea = result.rows[0];
    console.log("✅ Tarea creada con ID:", nuevaTarea.id);

    // 🔔 CREAR NOTIFICACIÓN DE NUEVA TAREA
    try {
      const NotificacionesService = require('../services/notificaciones.service');
      await NotificacionesService.crearNotificacionNuevaTarea(nuevaTarea);
    } catch (notifError) {
      console.error("⚠️ Error creando notificación:", notifError);
      // No fallar la creación de la tarea por error en notificación
    }

    res.status(201).json(nuevaTarea);
  } catch (error) {
    console.error("❌ Error en crearTarea:", error);
    next(error);
  }
};

// ✏️ EDITAR TAREA (ACTUALIZADO)
const editarTarea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      descripcion, 
      fecha_inicio, 
      fecha_vencimiento,
      hora_inicio,
      hora_vencimiento,
      todo_el_dia,
      estado 
    } = req.body;

    console.log("✏️ Editando tarea ID:", id);

    // Obtener tarea actual para comparar
    const tareaActual = await pool.query(
      'SELECT estado FROM tareas WHERE id = $1',
      [id]
    );

    // Si es todo el día, establecer horas como null
    const horaInicioFinal = todo_el_dia ? null : hora_inicio;
    const horaVencimientoFinal = todo_el_dia ? null : hora_vencimiento;

    const result = await pool.query(
      `UPDATE tareas 
       SET titulo = $1, 
           descripcion = $2, 
           fecha_inicio = $3, 
           fecha_vencimiento = $4,
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
        fecha_vencimiento || fecha_inicio,
        horaInicioFinal,
        horaVencimientoFinal,
        todo_el_dia !== undefined ? todo_el_dia : true,
        estado, 
        id
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Tarea no encontrada" });

    const tareaEditada = result.rows[0];
    console.log("✅ Tarea actualizada:", tareaEditada.id);

    // 🔔 CREAR NOTIFICACIÓN SI SE COMPLETÓ LA TAREA
    try {
      const estadoAnterior = tareaActual.rows[0]?.estado;
      if (estadoAnterior !== 'completada' && estado === 'completada') {
        const NotificacionesService = require('../services/notificaciones.service');
        await NotificacionesService.crearNotificacionTareaCompletada(tareaEditada);
      }
    } catch (notifError) {
      console.error("⚠️ Error creando notificación de completado:", notifError);
    }

    res.json(tareaEditada);
  } catch (error) {
    console.error("❌ Error en editarTarea:", error);
    next(error);
  }
};

// ❌ ELIMINAR TAREA
const eliminarTarea = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Eliminando tarea ID:", id);

    const result = await pool.query("DELETE FROM tareas WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Tarea no encontrada" });

    console.log("✅ Tarea eliminada ID:", id);
    res.sendStatus(204);
  } catch (error) {
    console.error("❌ Error en eliminarTarea:", error);
    next(error);
  }
};

module.exports = { 
  listarTareas, 
  listarTodasTareas,
  crearTarea, 
  editarTarea, 
  eliminarTarea 
};