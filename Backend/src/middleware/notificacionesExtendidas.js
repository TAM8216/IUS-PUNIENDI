const pool = require("../db");

// Middleware extendido para notificaciones
const notificacionesExtendidasMiddleware = async (req, res, next) => {
  const originalSend = res.send;
  const usuario = req.user || { id: null, nombre: 'Sistema' };
  const metodo = req.method;
  const ruta = req.originalUrl;
  const datosEntrada = req.body;
  
  res.send = async function(data) {
    try {
      // Procesar la respuesta original
      const resultado = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Determinar tipo de entidad y acción
      const entidad = obtenerEntidadDesdeRuta(ruta);
      const accion = obtenerAccion(metodo);
      
      // Si es una acción importante, procesar notificaciones
      if (debeNotificar(metodo, entidad) && accion && usuario.id) {
        // Esperar a que se complete la respuesta original
        originalSend.call(this, data);
        
        // Procesar notificaciones de manera asíncrona
        setTimeout(async () => {
          try {
            await procesarNotificaciones({
              usuario,
              entidad,
              accion,
              datosEntrada,
              resultado,
              ruta,
              metodo
            });
          } catch (error) {
            console.error('❌ Error procesando notificaciones:', error);
          }
        }, 0);
        
        return;
      }
      
      // Si no necesita notificación, enviar respuesta normal
      originalSend.call(this, data);
      
    } catch (error) {
      console.error('❌ Error en middleware de notificaciones:', error);
      originalSend.call(this, data);
    }
  };
  
  next();
};

// Función para determinar entidad desde la ruta
function obtenerEntidadDesdeRuta(ruta) {
  if (ruta.includes('/api/tareas')) return 'tarea';
  if (ruta.includes('/api/acciones')) return 'accion';
  if (ruta.includes('/api/casos')) return 'caso';
  if (ruta.includes('/api/usuarios')) return 'usuario';
  if (ruta.includes('/api/clientes')) return 'cliente';
  if (ruta.includes('/api/documentos')) return 'documento';
  if (ruta.includes('/api/instituciones')) return 'institucion';
  if (ruta.includes('/api/jurisprudencias')) return 'jurisprudencia';
  return null;
}

// Función para determinar acción
function obtenerAccion(metodo) {
  switch(metodo) {
    case 'POST': return 'creó';
    case 'PUT': return 'actualizó';
    case 'DELETE': return 'eliminó';
    case 'PATCH': return 'modificó';
    default: return null;
  }
}

// Función para determinar si se debe notificar
function debeNotificar(metodo, entidad) {
  // Solo notificar acciones de creación, actualización y eliminación
  const metodosImportantes = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const entidadesImportantes = ['tarea', 'accion', 'caso', 'usuario', 'cliente', 'documento'];
  
  return metodosImportantes.includes(metodo) && 
         entidadesImportantes.includes(entidad);
}

// Función principal para procesar notificaciones
async function procesarNotificaciones(datos) {
  const { usuario, entidad, accion, datosEntrada, resultado, ruta, metodo } = datos;
  
  console.log(`📨 Procesando notificación: ${usuario.nombre} ${accion} ${entidad}`);
  
  // Crear notificación base
  const notificacionBase = {
    usuario_id: usuario.id,
    usuario_origen: usuario.nombre,
    entidad,
    accion,
    datos: datosEntrada,
    resultado,
    ruta,
    metodo,
    fecha_creacion: new Date()
  };
  
  switch (entidad) {
    case 'tarea':
      await procesarNotificacionTarea(notificacionBase);
      break;
    case 'accion':
      await procesarNotificacionAccion(notificacionBase);
      break;
    case 'caso':
      await procesarNotificacionCaso(notificacionBase);
      break;
    default:
      await procesarNotificacionGeneral(notificacionBase);
  }
}

// Procesar notificación específica para tareas
async function procesarNotificacionTarea(notificacion) {
  const { datos, resultado, accion } = notificacion;
  
  let titulo = '';
  let mensaje = '';
  let tipo = 'info';
  let usuariosNotificar = [];
  
  // Obtener detalles de la tarea
  const tareaId = resultado?.id || datos?.id;
  const tareaTitulo = resultado?.titulo || datos?.titulo || 'Tarea';
  
  // Obtener usuario asignado a la tarea
  const usuarioTareaId = resultado?.usuario_id || datos?.usuario_id;
  
  // Obtener supervisores del usuario asignado
  if (usuarioTareaId) {
    const supervisores = await obtenerSupervisoresDeUsuario(usuarioTareaId);
    usuariosNotificar = [...supervisores];
    
    // También notificar al usuario asignado (excepto cuando él mismo crea la tarea)
    if (usuarioTareaId !== notificacion.usuario_id) {
      usuariosNotificar.push(usuarioTareaId);
    }
  }
  
  // Crear mensajes según la acción
  switch (accion) {
    case 'creó':
      titulo = 'Nueva Tarea Asignada';
      mensaje = `${notificacion.usuario_origen} te ha asignado la tarea: "${tareaTitulo}"`;
      tipo = 'success';
      break;
    case 'actualizó':
      titulo = 'Tarea Actualizada';
      mensaje = `${notificacion.usuario_origen} actualizó la tarea: "${tareaTitulo}"`;
      tipo = 'warning';
      
      // Verificar si cambió el estado
      if (datos.estado && datos.estado !== resultado.estado_anterior) {
        const estadoTexto = obtenerTextoEstado(datos.estado);
        mensaje = `${notificacion.usuario_origen} cambió el estado de la tarea "${tareaTitulo}" a ${estadoTexto}`;
        
        // Si se completó, notificar con mayor prioridad
        if (datos.estado === 'completada') {
          tipo = 'success';
          titulo = '¡Tarea Completada!';
        }
      }
      break;
    case 'eliminó':
      titulo = 'Tarea Eliminada';
      mensaje = `${notificacion.usuario_origen} eliminó la tarea: "${tareaTitulo}"`;
      tipo = 'error';
      break;
  }
  
  // Obtener todos los administradores para notificar
  const admins = await obtenerTodosAdmins();
  usuariosNotificar = [...new Set([...usuariosNotificar, ...admins])];
  
  // Crear y enviar notificaciones
  await crearNotificacionesParaUsuarios(usuariosNotificar, {
    titulo,
    mensaje,
    tipo,
    entidad: 'tarea',
    entidad_id: tareaId,
    metadata: {
      tarea_titulo: tareaTitulo,
      estado: resultado?.estado || datos?.estado,
      fecha_vencimiento: resultado?.fecha_vencimiento || datos?.fecha_vencimiento,
      prioridad: resultado?.prioridad || datos?.prioridad
    }
  });
}

// Procesar notificación específica para acciones
async function procesarNotificacionAccion(notificacion) {
  const { datos, resultado, accion } = notificacion;
  
  let titulo = '';
  let mensaje = '';
  let tipo = 'info';
  let usuariosNotificar = [];
  
  // Obtener detalles de la acción
  const accionId = resultado?.id || datos?.id;
  const accionTitulo = resultado?.titulo || datos?.titulo || 'Acción';
  const casoId = resultado?.caso_id || datos?.caso_id;
  
  // Obtener información del caso
  let casoInfo = null;
  if (casoId) {
    casoInfo = await obtenerInfoCaso(casoId);
  }
  
  // Obtener usuarios relacionados con el caso
  if (casoId) {
    const usuariosCaso = await obtenerUsuariosRelacionadosCaso(casoId);
    usuariosNotificar = [...usuariosCaso];
  }
  
  // Obtener todos los administradores
  const admins = await obtenerTodosAdmins();
  usuariosNotificar = [...new Set([...usuariosNotificar, ...admins])];
  
  // Crear mensajes según la acción
  switch (accion) {
    case 'creó':
      titulo = casoInfo ? `Nueva Acción en Caso: ${casoInfo.nurej_cud}` : 'Nueva Acción Creada';
      mensaje = `${notificacion.usuario_origen} ${accion} la acción "${accionTitulo}"`;
      if (casoInfo) {
        mensaje += ` en el caso "${casoInfo.nurej_cud} - ${casoInfo.delito}"`;
      }
      tipo = 'success';
      break;
    case 'actualizó':
      titulo = casoInfo ? `Acción Actualizada: ${casoInfo.nurej_cud}` : 'Acción Actualizada';
      mensaje = `${notificacion.usuario_origen} ${accion} la acción "${accionTitulo}"`;
      if (casoInfo) {
        mensaje += ` en el caso "${casoInfo.nurej_cud}"`;
      }
      tipo = 'warning';
      
      // Verificar si cambió el estado
      if (datos.estado && datos.estado !== resultado.estado_anterior) {
        const estadoTexto = obtenerTextoEstado(datos.estado);
        mensaje = `${notificacion.usuario_origen} cambió el estado de la acción "${accionTitulo}" a ${estadoTexto}`;
        
        // Si se completó, notificar con mayor prioridad
        if (datos.estado === 'completada') {
          tipo = 'success';
          titulo = casoInfo ? `¡Acción Completada: ${casoInfo.nurej_cud}!` : '¡Acción Completada!';
        }
      }
      break;
    case 'eliminó':
      titulo = casoInfo ? `Acción Eliminada: ${casoInfo.nurej_cud}` : 'Acción Eliminada';
      mensaje = `${notificacion.usuario_origen} ${accion} la acción "${accionTitulo}"`;
      if (casoInfo) {
        mensaje += ` del caso "${casoInfo.nurej_cud}"`;
      }
      tipo = 'error';
      break;
  }
  
  // Crear y enviar notificaciones
  await crearNotificacionesParaUsuarios(usuariosNotificar, {
    titulo,
    mensaje,
    tipo,
    entidad: 'accion',
    entidad_id: accionId,
    metadata: {
      accion_titulo: accionTitulo,
      caso_info: casoInfo,
      estado: resultado?.estado || datos?.estado,
      fecha_vencimiento: resultado?.fecha_vencimiento || datos?.fecha_vencimiento
    }
  });
}

// Función auxiliar para obtener supervisores de un usuario
async function obtenerSupervisoresDeUsuario(usuarioId) {
  try {
    const query = `
      WITH RECURSIVE supervisores AS (
        SELECT supervisor_id FROM usuarios WHERE id = $1 AND supervisor_id IS NOT NULL
        UNION
        SELECT u.supervisor_id FROM usuarios u
        INNER JOIN supervisores s ON u.id = s.supervisor_id
        WHERE u.supervisor_id IS NOT NULL
      )
      SELECT supervisor_id FROM supervisores
      UNION
      SELECT id FROM usuarios WHERE rol IN ('admin', 'superadmin') AND estado = 'activo'
    `;
    
    const result = await pool.query(query, [usuarioId]);
    return result.rows.map(row => row.supervisor_id).filter(id => id !== null);
  } catch (error) {
    console.error('❌ Error obteniendo supervisores:', error);
    return [];
  }
}

// Función auxiliar para obtener información de un caso
async function obtenerInfoCaso(casoId) {
  try {
    const query = `
      SELECT nurej_cud, delito, estado, abogado_id 
      FROM casos 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [casoId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error obteniendo info del caso:', error);
    return null;
  }
}

// Función auxiliar para obtener usuarios relacionados con un caso
async function obtenerUsuariosRelacionadosCaso(casoId) {
  try {
    const usuarios = [];
    
    // Obtener abogado asignado al caso
    const queryCaso = 'SELECT abogado_id FROM casos WHERE id = $1';
    const resultCaso = await pool.query(queryCaso, [casoId]);
    
    if (resultCaso.rows[0]?.abogado_id) {
      usuarios.push(resultCaso.rows[0].abogado_id);
      
      // Obtener supervisores del abogado
      const supervisores = await obtenerSupervisoresDeUsuario(resultCaso.rows[0].abogado_id);
      usuarios.push(...supervisores);
    }
    
    // Obtener usuarios con acciones en este caso
    const queryAcciones = `
      SELECT DISTINCT usuario_id 
      FROM acciones 
      WHERE caso_id = $1 AND usuario_id IS NOT NULL
    `;
    
    const resultAcciones = await pool.query(queryAcciones, [casoId]);
    resultAcciones.rows.forEach(row => {
      if (row.usuario_id && !usuarios.includes(row.usuario_id)) {
        usuarios.push(row.usuario_id);
      }
    });
    
    return [...new Set(usuarios)];
  } catch (error) {
    console.error('❌ Error obteniendo usuarios relacionados:', error);
    return [];
  }
}

// Función auxiliar para obtener todos los administradores
async function obtenerTodosAdmins() {
  try {
    const query = `
      SELECT id FROM usuarios 
      WHERE rol IN ('admin', 'superadmin') 
      AND estado = 'activo'
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('❌ Error obteniendo admins:', error);
    return [];
  }
}

// Función auxiliar para obtener texto de estado
function obtenerTextoEstado(estado) {
  const estados = {
    pendiente: 'Pendiente',
    en_progreso: 'En Progreso',
    completada: 'Completada',
    cancelada: 'Cancelada',
    activo: 'Activo',
    inactivo: 'Inactivo',
    finalizado: 'Finalizado'
  };
  
  return estados[estado] || estado;
}

// Función para crear notificaciones para múltiples usuarios
async function crearNotificacionesParaUsuarios(usuariosIds, datosNotificacion) {
  if (usuariosIds.length === 0) return;
  
  try {
    const insertPromises = usuariosIds.map(usuarioId => {
      return pool.query(
        `INSERT INTO notificaciones (
          usuario_id, tipo, titulo, mensaje, 
          entidad, entidad_id, metadata, leido, fecha_creacion, prioridad, usuario_origen
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          usuarioId,
          datosNotificacion.tipo,
          datosNotificacion.titulo,
          datosNotificacion.mensaje,
          datosNotificacion.entidad,
          datosNotificacion.entidad_id,
          JSON.stringify(datosNotificacion.metadata || {}),
          false,
          new Date(),
          datosNotificacion.tipo === 'error' ? 3 : 
          datosNotificacion.tipo === 'warning' ? 2 : 
          datosNotificacion.tipo === 'success' ? 1 : 0,
          datosNotificacion.usuario_origen || 'Sistema'
        ]
      );
    });
    
    await Promise.all(insertPromises);
    console.log(`📨 Notificaciones creadas para ${usuariosIds.length} usuarios`);
    
  } catch (error) {
    console.error('❌ Error creando notificaciones:', error);
  }
}

// Procesar notificación general para otras entidades
async function procesarNotificacionGeneral(notificacion) {
  const { entidad, accion, usuario_origen } = notificacion;
  
  const titulo = `${entidad.charAt(0).toUpperCase() + entidad.slice(1)} ${accion}`;
  const mensaje = `${usuario_origen} ${accion} un ${entidad}`;
  const tipo = accion === 'eliminó' ? 'error' : accion === 'creó' ? 'success' : 'warning';
  
  // Obtener todos los administradores
  const admins = await obtenerTodosAdmins();
  
  await crearNotificacionesParaUsuarios(admins, {
    titulo,
    mensaje,
    tipo,
    entidad,
    entidad_id: notificacion.resultado?.id || notificacion.datos?.id,
    metadata: {
      entidad_nombre: notificacion.resultado?.nombre || notificacion.resultado?.titulo
    }
  });
}

// Procesar notificación específica para casos
async function procesarNotificacionCaso(notificacion) {
  const { datos, resultado, accion } = notificacion;
  
  let titulo = '';
  let mensaje = '';
  let tipo = 'info';
  let usuariosNotificar = [];
  
  // Obtener detalles del caso
  const casoId = resultado?.id || datos?.id;
  const casoNurej = resultado?.nurej_cud || datos?.nurej_cud || 'Caso';
  const casoDelito = resultado?.delito || datos?.delito || 'Sin título';
  
  // Obtener usuarios relacionados con el caso
  if (casoId) {
    const usuariosCaso = await obtenerUsuariosRelacionadosCaso(casoId);
    usuariosNotificar = [...usuariosCaso];
  }
  
  // Obtener todos los administradores
  const admins = await obtenerTodosAdmins();
  usuariosNotificar = [...new Set([...usuariosNotificar, ...admins])];
  
  // Crear mensajes según la acción
  switch (accion) {
    case 'creó':
      titulo = 'Nuevo Caso Creado';
      mensaje = `${notificacion.usuario_origen} ${accion} el caso "${casoNurej} - ${casoDelito}"`;
      tipo = 'success';
      break;
    case 'actualizó':
      titulo = 'Caso Actualizado';
      mensaje = `${notificacion.usuario_origen} ${accion} el caso "${casoNurej}"`;
      tipo = 'warning';
      
      // Verificar cambios importantes
      if (datos.estado && datos.estado !== resultado.estado_anterior) {
        mensaje = `${notificacion.usuario_origen} cambió el estado del caso "${casoNurej}" a ${datos.estado}`;
        
        if (datos.estado === 'Finalizado') {
          tipo = 'success';
          titulo = '¡Caso Finalizado!';
        }
      }
      break;
    case 'eliminó':
      titulo = 'Caso Eliminado';
      mensaje = `${notificacion.usuario_origen} ${accion} el caso "${casoNurej} - ${casoDelito}"`;
      tipo = 'error';
      break;
  }
  
  // Crear y enviar notificaciones
  await crearNotificacionesParaUsuarios(usuariosNotificar, {
    titulo,
    mensaje,
    tipo,
    entidad: 'caso',
    entidad_id: casoId,
    metadata: {
      caso_nurej: casoNurej,
      caso_delito: casoDelito,
      estado: resultado?.estado || datos?.estado
    }
  });
}

module.exports = {
  notificacionesExtendidasMiddleware,
  crearNotificacionesParaUsuarios
};