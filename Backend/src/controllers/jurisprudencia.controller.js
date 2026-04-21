const pool = require("../db");

// 📋 LISTAR JURISPRUDENCIAS
const listarJurisprudencias = async (req, res, next) => {
  try {
    console.log("📋 [LISTAR] Listando jurisprudencias");
    
    const result = await pool.query(`
      SELECT * FROM jurisprudencia 
      ORDER BY fecha_emision DESC NULLS LAST, fecha_creacion DESC 
      LIMIT 100
    `);
    
    console.log(`✅ [LISTAR] ${result.rows.length} jurisprudencias encontradas`);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ [LISTAR] Error:", error);
    next(error);
  }
};

// 🔍 VERIFICAR SI UNA JURISPRUDENCIA YA EXISTE
const verificarExistencia = async (req, res, next) => {
  try {
    const { expediente } = req.query;
    
    console.log(`🔍 [VERIFICAR] Verificando existencia de expediente: ${expediente}`);
    
    if (!expediente) {
      return res.status(400).json({ 
        success: false,
        error: "Se requiere el parámetro 'expediente'" 
      });
    }

    const result = await pool.query(
      "SELECT * FROM jurisprudencia WHERE nro_expediente ILIKE $1 OR titulo ILIKE $2 LIMIT 5",
      [`%${expediente}%`, `%${expediente}%`]
    );

    console.log(`📊 [VERIFICAR] ${result.rows.length} resultados encontrados`);

    res.json({
      success: true,
      existe: result.rows.length > 0,
      datos: result.rows
    });
  } catch (error) {
    console.error("❌ [VERIFICAR] Error:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar jurisprudencia",
      details: error.message
    });
  }
};

// ➕ CREAR JURISPRUDENCIA (LOCAL O IMPORTADA)
const crearJurisprudencia = async (req, res, next) => {
  try {
    console.log("📝 [CREAR] Iniciando creación de jurisprudencia");
    
    const { 
      // Datos básicos
      titulo, 
      tipo = 'Resolución', 
      descripcion = '', 
      fecha_publicacion, 
      materia,
      
      // Datos del TSJ
      nro_resolucion,
      nro_expediente,
      fecha_emision,
      tipo_resolucion,
      departamento,
      id_sala,
      sala,
      magistrado,
      forma_resolucion,
      restrictor,
      descriptor,
      tipo_jurisprudencia,
      proceso,
      precedente,
      ratio,
      demandante,
      demandado,
      id_tema,
      maxima,
      sintesis,
      contenido,
      contenido_html,
      
      // Datos de integración
      fuente = 'manual',
      enlace_externo
    } = req.body;

    console.log("📝 [CREAR] Datos recibidos:", JSON.stringify(req.body, null, 2));

    // Función para parsear fecha (misma que en importar)
    const parsearFecha = (fechaStr) => {
      if (!fechaStr || fechaStr === 'No especificada' || fechaStr === 'undefined') {
        return null;
      }
      
      try {
        if (fechaStr.includes('-')) {
          const partes = fechaStr.split('-');
          if (partes.length === 3) {
            const [dia, mes, anio] = partes;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
        }
        return null;
      } catch (error) {
        return null;
      }
    };

    // Validar datos mínimos
    if (!titulo && !nro_resolucion) {
      console.error("❌ [CREAR] Error: título o nro_resolucion es requerido");
      return res.status(400).json({ 
        success: false,
        error: "Los campos 'titulo' o 'nro_resolucion' son requeridos" 
      });
    }

    // Verificar si ya existe por número de expediente
    if (nro_expediente) {
      console.log(`🔍 [CREAR] Verificando existencia de expediente: ${nro_expediente}`);
      const existencia = await pool.query(
        "SELECT id FROM jurisprudencia WHERE nro_expediente = $1",
        [nro_expediente]
      );
      
      if (existencia.rows.length > 0) {
        console.log(`⚠️ [CREAR] Ya existe jurisprudencia con expediente: ${nro_expediente}`);
        return res.status(409).json({
          success: false,
          error: "Ya existe una jurisprudencia con este número de expediente",
          datos: existencia.rows[0]
        });
      }
    }

    // Preparar datos
    const datosJurisprudencia = {
      titulo: titulo || (nro_resolucion ? `Resolución ${nro_resolucion}` : 'Sin título'),
      tipo: tipo || 'Resolución',
      descripcion: descripcion || '',
      fecha_publicacion: parsearFecha(fecha_publicacion) || new Date().toISOString().split('T')[0],
      materia: materia || 'Sin materia especificada',
      nro_resolucion,
      nro_expediente,
      fecha_emision: parsearFecha(fecha_emision),
      tipo_resolucion: tipo_resolucion || 'Resolución',
      departamento,
      id_sala: id_sala ? parseInt(id_sala) : null,
      sala,
      magistrado,
      forma_resolucion,
      restrictor,
      descriptor,
      tipo_jurisprudencia,
      proceso,
      precedente,
      ratio,
      demandante,
      demandado,
      id_tema: id_tema ? parseInt(id_tema) : null,
      maxima,
      sintesis,
      contenido,
      contenido_html,
      fuente,
      enlace_externo
    };

    // Convertir undefined a null
    Object.keys(datosJurisprudencia).forEach(key => {
      if (datosJurisprudencia[key] === undefined) {
        datosJurisprudencia[key] = null;
      }
    });

    // Preparar la consulta SQL
    const campos = Object.keys(datosJurisprudencia).filter(key => datosJurisprudencia[key] !== null);
    const valores = campos.map(campo => datosJurisprudencia[campo]);
    const placeholders = campos.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO jurisprudencia (${campos.join(', ')}, fecha_creacion, fecha_actualizacion)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;

    console.log(`📋 [CREAR] Query SQL:`, query);
    console.log(`📋 [CREAR] Valores:`, valores);

    const result = await pool.query(query, valores);
    const nuevaJurisprudencia = result.rows[0];

    console.log(`✅ [CREAR] Jurisprudencia creada exitosamente. ID: ${nuevaJurisprudencia.id}`);

    res.status(201).json({
      success: true,
      message: "Jurisprudencia creada exitosamente",
      data: nuevaJurisprudencia
    });
  } catch (error) {
    console.error("❌ [CREAR] Error al crear jurisprudencia:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: "Ya existe una jurisprudencia con estos datos",
        code: error.code,
        detail: error.detail
      });
    }
    
    if (error.code === '22P02' || error.code === '22007') {
      return res.status(400).json({
        success: false,
        error: `Error en el tipo de datos enviados: ${error.message}`,
        code: error.code,
        detail: error.detail
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Error al crear jurisprudencia",
      details: error.message,
      code: error.code
    });
  }
};

// IMPORTAR JURISPRUDENCIA DESDE TSJ
const importarDesdeTSJ = async (req, res, next) => {
  try {
    console.log("📥 [IMPORTAR] Iniciando importación desde TSJ");
    console.log("📥 [IMPORTAR] Datos recibidos:", JSON.stringify(req.body, null, 2));
    
    const { 
      expediente,
      sala,
      fecha,
      link,
      materia,
      id_tema,
      datos_completos 
    } = req.body;

    // Validar datos mínimos
    if (!expediente) {
      console.error("❌ [IMPORTAR] Error: expediente es requerido");
      return res.status(400).json({ 
        success: false,
        error: "El campo 'expediente' es requerido" 
      });
    }

    // Verificar si ya existe
    console.log(`🔍 [IMPORTAR] Verificando existencia de expediente: ${expediente}`);
    const existencia = await pool.query(
      "SELECT id FROM jurisprudencia WHERE nro_expediente = $1",
      [expediente]
    );
    
    if (existencia.rows.length > 0) {
      console.log(`⚠️ [IMPORTAR] Ya existe jurisprudencia con expediente: ${expediente}`);
      return res.status(409).json({
        success: false,
        error: "Ya existe una jurisprudencia con este número de expediente",
        existe: true,
        datos: existencia.rows[0]
      });
    }

    // Extraer datos completos
    const datosTSJ = datos_completos || {};
    console.log(`📊 [IMPORTAR] Datos TSJ recibidos:`, datosTSJ);
    
    // Función para parsear fecha
    const parsearFecha = (fechaStr) => {
      if (!fechaStr || fechaStr === 'No especificada' || fechaStr === 'undefined') {
        return null;
      }
      
      try {
        // Intentar diferentes formatos de fecha
        if (fechaStr.includes('-')) {
          const partes = fechaStr.split('-');
          if (partes.length === 3) {
            // Formato DD-MM-YYYY
            const [dia, mes, anio] = partes;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
        }
        
        // Si no se puede parsear, retornar null
        return null;
      } catch (error) {
        console.warn(`⚠️ [IMPORTAR] Error parseando fecha: ${fechaStr}`, error);
        return null;
      }
    };

    // Preparar datos para inserción
    const jurisprudenciaData = {
      // Datos básicos
      titulo: datosTSJ.nro_resolucion ? 
        `${datosTSJ.tipo_resolucion || 'Resolución'} ${datosTSJ.nro_resolucion}` : 
        `TSJ - ${expediente}`,
      
      tipo: datosTSJ.tipo_resolucion || 'Resolución',
      descripcion: `Jurisprudencia del Tribunal Supremo de Justicia. ${sala ? `Sala: ${sala}` : ''} ${datosTSJ.departamento ? `Departamento: ${datosTSJ.departamento}` : ''}`.trim(),
      fecha_publicacion: parsearFecha(fecha) || parsearFecha(datosTSJ.fecha_publicacion) || new Date().toISOString().split('T')[0],
      materia: materia || datosTSJ.descriptor || 'Sin materia especificada',
      
      // Datos del TSJ
      nro_resolucion: datosTSJ.nro_resolucion,
      nro_expediente: expediente,
      fecha_emision: parsearFecha(datosTSJ.fecha_emision),
      tipo_resolucion: datosTSJ.tipo_resolucion || 'Resolución',
      departamento: datosTSJ.departamento,
      id_sala: datosTSJ.id_sala ? parseInt(datosTSJ.id_sala) : null,
      sala: sala || datosTSJ.sala,
      magistrado: datosTSJ.magistrado,
      forma_resolucion: datosTSJ.forma_resolucion,
      restrictor: datosTSJ.restrictor,
      descriptor: datosTSJ.descriptor,
      tipo_jurisprudencia: datosTSJ.tipo_jurisprudencia,
      proceso: datosTSJ.proceso,
      precedente: datosTSJ.precedente,
      ratio: datosTSJ.ratio,
      demandante: datosTSJ.demandante,
      demandado: datosTSJ.demandado,
      id_tema: id_tema || datosTSJ.id_tema ? parseInt(id_tema || datosTSJ.id_tema) : null,
      maxima: datosTSJ.maxima,
      sintesis: datosTSJ.sintesis,
      contenido: datosTSJ.contenido,
      contenido_html: datosTSJ.contenido_html,
      
      // Datos de integración
      fuente: 'tsj_bolivia',
      enlace_externo: link || (datosTSJ.id ? `https://jurisprudencia.tsj.bo/jurisprudencia/${datosTSJ.id}` : null)
    };

    // Asignar valores por defecto para campos undefined
    Object.keys(jurisprudenciaData).forEach(key => {
      if (jurisprudenciaData[key] === undefined) {
        jurisprudenciaData[key] = null;
      }
    });

    console.log(`📝 [IMPORTAR] Datos preparados para inserción:`, jurisprudenciaData);

    // Preparar la consulta SQL
    const campos = Object.keys(jurisprudenciaData);
    const valores = campos.map(campo => {
      const valor = jurisprudenciaData[campo];
      // Convertir a null si es undefined, null o cadena vacía
      return valor === undefined || valor === null || valor === '' ? null : valor;
    });
    
    const placeholders = campos.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO jurisprudencia (${campos.join(', ')}, fecha_creacion, fecha_actualizacion)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;

    console.log(`📋 [IMPORTAR] Query SQL:`, query);
    console.log(`📋 [IMPORTAR] Valores:`, valores);

    const result = await pool.query(query, valores);
    const nuevaJurisprudencia = result.rows[0];

    console.log(`✅ [IMPORTAR] Jurisprudencia importada exitosamente. ID: ${nuevaJurisprudencia.id}`);

    res.status(201).json({
      success: true,
      message: "Jurisprudencia importada exitosamente desde TSJ",
      data: nuevaJurisprudencia
    });
  } catch (error) {
    console.error("❌ [IMPORTAR] Error al importar jurisprudencia desde TSJ:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    // Verificar si es error de duplicado
    if (error.code === '23505') { // Código de violación de unicidad en PostgreSQL
      return res.status(409).json({
        success: false,
        error: "Ya existe una jurisprudencia con estos datos",
        code: error.code,
        detail: error.detail
      });
    }
    
    // Verificar si es error de tipo de dato (incluyendo fecha inválida)
    if (error.code === '22P02' || error.code === '22007') {
      return res.status(400).json({
        success: false,
        error: `Error en el tipo de datos enviados: ${error.message}`,
        code: error.code,
        detail: error.detail
      });
    }
    
    // Error genérico
    res.status(500).json({
      success: false,
      error: "Error al importar jurisprudencia desde TSJ",
      details: error.message,
      code: error.code
    });
  }
};

// ✏️ EDITAR JURISPRUDENCIA
const editarJurisprudencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Obtener todos los campos posibles del cuerpo
    const camposPermitidos = [
      'titulo', 'tipo', 'descripcion', 'fecha_publicacion', 'materia',
      'nro_resolucion', 'nro_expediente', 'fecha_emision', 'tipo_resolucion',
      'departamento', 'id_sala', 'sala', 'magistrado', 'forma_resolucion',
      'restrictor', 'descriptor', 'tipo_jurisprudencia', 'proceso',
      'precedente', 'ratio', 'demandante', 'demandado', 'id_tema',
      'maxima', 'sintesis', 'contenido', 'contenido_html',
      'fuente', 'enlace_externo'
    ];

    // Filtrar campos que vienen en el request body
    const camposActualizar = [];
    const valores = [];
    
    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        camposActualizar.push(`${campo} = $${valores.length + 1}`);
        valores.push(req.body[campo]);
      }
    });

    // Agregar fecha de actualización
    camposActualizar.push(`fecha_actualizacion = $${valores.length + 1}`);
    valores.push(new Date());

    // Agregar ID al final
    valores.push(id);

    if (camposActualizar.length === 0) {
      return res.status(400).json({ 
        error: "No hay campos para actualizar" 
      });
    }

    const query = `
      UPDATE jurisprudencia
      SET ${camposActualizar.join(', ')}
      WHERE id = $${valores.length}
      RETURNING *
    `;

    const result = await pool.query(query, valores);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Jurisprudencia no encontrada" 
      });
    }

    res.json({
      success: true,
      message: "Jurisprudencia actualizada exitosamente",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error al editar jurisprudencia:", error);
    next(error);
  }
};

// ❌ ELIMINAR JURISPRUDENCIA
const eliminarJurisprudencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "DELETE FROM jurisprudencia WHERE id = $1 RETURNING *", 
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Jurisprudencia no encontrada" 
      });
    }

    res.json({
      success: true,
      message: "Jurisprudencia eliminada exitosamente",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error al eliminar jurisprudencia:", error);
    next(error);
  }
};

// 🔍 OBTENER JURISPRUDENCIA POR ID
const obtenerJurisprudenciaPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "SELECT * FROM jurisprudencia WHERE id = $1", 
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Jurisprudencia no encontrada" 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error al obtener jurisprudencia:", error);
    next(error);
  }
};

// 🔍 BUSCAR JURISPRUDENCIAS
const buscarJurisprudencias = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        error: "Se requiere el parámetro de búsqueda 'q'" 
      });
    }

    const searchQuery = `
      SELECT * FROM jurisprudencia 
      WHERE 
        titulo ILIKE $1 OR
        descripcion ILIKE $1 OR
        materia ILIKE $1 OR
        nro_resolucion ILIKE $1 OR
        nro_expediente ILIKE $1 OR
        contenido ILIKE $1 OR
        sintesis ILIKE $1 OR
        ratio ILIKE $1 OR
        demanda ILIKE $1 OR
        demandado ILIKE $1
      ORDER BY fecha_emision DESC
      LIMIT 50
    `;

    const result = await pool.query(searchQuery, [`%${q}%`]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error("Error en búsqueda de jurisprudencias:", error);
    next(error);
  }
};

module.exports = {
  listarJurisprudencias,
  verificarExistencia,
  crearJurisprudencia,
  importarDesdeTSJ,
  editarJurisprudencia,
  eliminarJurisprudencia,
  obtenerJurisprudenciaPorId,
  buscarJurisprudencias
};