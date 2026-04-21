const pool = require("../db");

// 🕒 SERVICIO PARA VERIFICAR TAREAS Y CREAR NOTIFICACIONES
class NotificacionesService {
  
  // VERIFICAR TAREAS QUE COMIENZAN HOY
  static async verificarTareasQueComienzan() {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      console.log(`🔍 Verificando tareas que comienzan hoy: ${hoy}`);
      
      const result = await pool.query(
        `SELECT t.*, u.nombre as usuario_nombre
         FROM tareas t
         LEFT JOIN usuarios u ON t.usuario_id = u.id
         WHERE t.fecha_inicio = $1 
         AND t.estado NOT IN ('completada', 'cancelada')`,
        [hoy]
      );
      
      console.log(`📅 Tareas que comienzan hoy: ${result.rows.length}`);
      
      for (const tarea of result.rows) {
        await this.crearNotificacionInicioTarea(tarea);
      }
      
      return result.rows.length;
    } catch (error) {
      console.error("❌ Error en verificarTareasQueComienzan:", error);
      throw error;
    }
  }
  
  // VERIFICAR TAREAS QUE VENCEN HOY
  static async verificarTareasQueVencen() {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      console.log(`🔍 Verificando tareas que vencen hoy: ${hoy}`);
      
      const result = await pool.query(
        `SELECT t.*, u.nombre as usuario_nombre
         FROM tareas t
         LEFT JOIN usuarios u ON t.usuario_id = u.id
         WHERE t.fecha_vencimiento = $1 
         AND t.estado NOT IN ('completada', 'cancelada')`,
        [hoy]
      );
      
      console.log(`⏰ Tareas que vencen hoy: ${result.rows.length}`);
      
      for (const tarea of result.rows) {
        await this.crearNotificacionVencimientoTarea(tarea);
      }
      
      return result.rows.length;
    } catch (error) {
      console.error("❌ Error en verificarTareasQueVencen:", error);
      throw error;
    }
  }
  
  // CREAR NOTIFICACIÓN DE INICIO DE TAREA
  static async crearNotificacionInicioTarea(tarea) {
    try {
      const mensaje = `📅 La tarea "${tarea.titulo}" comienza hoy`;
      
      // Verificar si ya existe una notificación para esta tarea hoy
      const existeNotificacion = await pool.query(
        `SELECT id FROM notificaciones 
         WHERE tarea_id = $1 AND tipo = 'inicio' 
         AND DATE(fecha_creacion) = CURRENT_DATE`,
        [tarea.id]
      );
      
      if (existeNotificacion.rows.length === 0) {
        await pool.query(
          `INSERT INTO notificaciones (tarea_id, usuario_id, mensaje, tipo)
           VALUES ($1, $2, $3, $4)`,
          [tarea.id, tarea.usuario_id, mensaje, 'inicio']
        );
        console.log(`✅ Notificación de inicio creada para tarea: ${tarea.titulo}`);
      }
    } catch (error) {
      console.error("❌ Error en crearNotificacionInicioTarea:", error);
      throw error;
    }
  }
  
  // CREAR NOTIFICACIÓN DE VENCIMIENTO DE TAREA
  static async crearNotificacionVencimientoTarea(tarea) {
    try {
      const mensaje = `⏰ La tarea "${tarea.titulo}" vence hoy`;
      
      // Verificar si ya existe una notificación para esta tarea hoy
      const existeNotificacion = await pool.query(
        `SELECT id FROM notificaciones 
         WHERE tarea_id = $1 AND tipo = 'vencimiento' 
         AND DATE(fecha_creacion) = CURRENT_DATE`,
        [tarea.id]
      );
      
      if (existeNotificacion.rows.length === 0) {
        await pool.query(
          `INSERT INTO notificaciones (tarea_id, usuario_id, mensaje, tipo)
           VALUES ($1, $2, $3, $4)`,
          [tarea.id, tarea.usuario_id, mensaje, 'vencimiento']
        );
        console.log(`✅ Notificación de vencimiento creada para tarea: ${tarea.titulo}`);
      }
    } catch (error) {
      console.error("❌ Error en crearNotificacionVencimientoTarea:", error);
      throw error;
    }
  }
  
  // CREAR NOTIFICACIÓN CUANDO SE CREA UNA TAREA
  static async crearNotificacionNuevaTarea(tarea) {
    try {
      const mensaje = `🆕 Nueva tarea creada: "${tarea.titulo}"`;
      
      await pool.query(
        `INSERT INTO notificaciones (tarea_id, usuario_id, mensaje, tipo)
         VALUES ($1, $2, $3, $4)`,
        [tarea.id, tarea.usuario_id, mensaje, 'nueva_tarea']
      );
      
      console.log(`✅ Notificación de nueva tarea creada: ${tarea.titulo}`);
    } catch (error) {
      console.error("❌ Error en crearNotificacionNuevaTarea:", error);
      throw error;
    }
  }
  
  // CREAR NOTIFICACIÓN CUANDO SE COMPLETA UNA TAREA
  static async crearNotificacionTareaCompletada(tarea) {
    try {
      const mensaje = `✅ Tarea completada: "${tarea.titulo}"`;
      
      await pool.query(
        `INSERT INTO notificaciones (tarea_id, usuario_id, mensaje, tipo)
         VALUES ($1, $2, $3, $4)`,
        [tarea.id, tarea.usuario_id, mensaje, 'completada']
      );
      
      console.log(`✅ Notificación de tarea completada: ${tarea.titulo}`);
    } catch (error) {
      console.error("❌ Error en crearNotificacionTareaCompletada:", error);
      throw error;
    }
  }
}

module.exports = NotificacionesService;