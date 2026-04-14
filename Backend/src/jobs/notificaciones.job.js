const NotificacionesService = require('../services/notificaciones.service');

// 🕒 JOB PARA EJECUTAR VERIFICACIONES PERIÓDICAS
class NotificacionesJob {
  
  static async ejecutarVerificacionesDiarias() {
    try {
      console.log('🚀 Ejecutando verificaciones diarias de notificaciones...');
      
      const tareasInicio = await NotificacionesService.verificarTareasQueComienzan();
      const tareasVencimiento = await NotificacionesService.verificarTareasQueVencen();
      
      console.log(`📊 Resumen: ${tareasInicio} tareas que comienzan, ${tareasVencimiento} tareas que vencen`);
      
      return {
        tareasInicio,
        tareasVencimiento,
        fecha: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error en ejecutarVerificacionesDiarias:', error);
      throw error;
    }
  }
}

module.exports = NotificacionesJob;