const pool = require("../db");

// Middleware para auditar acciones
const auditoriaSimpleMiddleware = async (req, res, next) => {
  const originalSend = res.send;
  const usuario = req.user || { id: null, nombre: 'Sistema' };
  const metodo = req.method;
  const ruta = req.originalUrl;
  
  res.send = function(data) {
    // Determinar tabla afectada
    const tabla = obtenerTablaDesdeRuta(ruta);
    
    // Determinar tipo de acción
    const accion = obtenerAccion(metodo);
    
    // Si es una acción importante, guardar auditoría
    if (tabla && accion) {
      guardarAuditoriaSimple({
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre,
        tabla,
        accion,
        detalles: {
          metodo,
          ruta,
          datos: req.body,
          resultado: typeof data === 'string' ? data : 'ok'
        }
      }).catch(console.error);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Función para determinar la tabla desde la ruta
function obtenerTablaDesdeRuta(ruta) {
  if (ruta.includes('/api/usuarios')) return 'usuarios';
  if (ruta.includes('/api/casos')) return 'casos';
  if (ruta.includes('/api/clientes')) return 'clientes';
  if (ruta.includes('/api/documentos')) return 'documentos';
  if (ruta.includes('/api/instituciones')) return 'instituciones';
  if (ruta.includes('/api/tareas')) return 'tareas';
  if (ruta.includes('/api/jurisprudencias')) return 'jurisprudencias';
  if (ruta.includes('/api/acciones')) return 'acciones';
  return null;
}

// Función para determinar la acción
function obtenerAccion(metodo) {
  switch(metodo) {
    case 'POST': return 'creó';
    case 'PUT': return 'actualizó';
    case 'DELETE': return 'eliminó';
    default: return null;
  }
}

// Función para guardar auditoría simple
async function guardarAuditoriaSimple(datos) {
  try {
    const query = `
      INSERT INTO auditorias_simples (
        usuario_id, 
        usuario_nombre, 
        tabla, 
        accion, 
        detalles,
        fecha_hora
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await pool.query(query, [
      datos.usuario_id,
      datos.usuario_nombre,
      datos.tabla,
      datos.accion,
      JSON.stringify(datos.detalles),
      new Date()
    ]);
    
    console.log(`📝 Auditoría: ${datos.usuario_nombre} ${datos.accion} en ${datos.tabla}`);
  } catch (error) {
    console.error('❌ Error al guardar auditoría:', error);
  }
}

module.exports = {
  auditoriaSimpleMiddleware,
  guardarAuditoriaSimple
};