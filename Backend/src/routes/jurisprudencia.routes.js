const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require("cheerio");
const jurisprudenciaController = require("../controllers/jurisprudencia.controller");

const router = express.Router();

// ========================
// CONFIGURACIÓN DE LA API TSJ
// ========================

const TSJ_API_CONFIG = {
  BASE_URL: 'https://apigenesis.tsj.bo/api/v1',
  API_KEY: 'CiAYFxnN4GwYgtDv+0jo8MSm1VuTZ53ah8aJ2L8GkgI=',
  USERNAME: 'buscadorgenesis',
  
  getHeaders() {
    return {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'es-419,es;q=0.9,en;q=0.8,ru;q=0.7,fr;q=0.6',
      'apikey': this.API_KEY,
      'username': this.USERNAME,
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'Origin': 'https://genesis.tsj.bo',
      'Pragma': 'no-cache',
      'Referer': 'https://genesis.tsj.bo/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
  }
};

// ========================
// FUNCIONES UTILITARIAS
// ========================

async function buscarEnTSJ(params) {
  try {
    const url = `${TSJ_API_CONFIG.BASE_URL}/jurisprudencia/busqueda_arbol`;
    
    console.log('🌐 Consultando API TSJ con parámetros:', JSON.stringify(params, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: TSJ_API_CONFIG.getHeaders(),
      body: JSON.stringify(params)
    });
    
    console.log('📊 Respuesta recibida - Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error body:', errorText);
      
      if (response.status === 422) {
        try {
          const errorData = JSON.parse(errorText);
          console.error('🔍 Detalles validación:', JSON.stringify(errorData.error?.details, null, 2));
        } catch (e) {
          console.error('❌ Error parseando JSON:', e.message);
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Respuesta API TSJ exitosa. Claves:', Object.keys(data));
    
    return data;
    
  } catch (error) {
    console.error('❌ Error en conexión API TSJ:', error.message);
    throw error;
  }
}

function limpiarContenidoHTML(html) {
  if (!html) return '';
  
  return html
    .replace(/<[^>]*>/g, ' ') // Reemplazar tags con espacios
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/&nbsp;/g, ' ') // Reemplazar espacios no breaking
    .replace(/&amp;/g, '&') // Decodificar &
    .replace(/&lt;/g, '<') // Decodificar <
    .replace(/&gt;/g, '>') // Decodificar >
    .replace(/&quot;/g, '"') // Decodificar "
    .trim();
}

function generarExpediente(item, index) {
  // Intentar diferentes formas de generar el expediente
  if (item.nro_expediente) return item.nro_expediente;
  if (item.expediente) return item.expediente;
  if (item.codigo) return item.codigo;
  
  // Si hay nro_resolucion, usarlo como base
  if (item.nro_resolucion) {
    // Ejemplo: convertir "AS/0069/2025" a "EXP-AS-0069-2025"
    const partes = item.nro_resolucion.split('/');
    if (partes.length >= 2) {
      return `EXP-${partes[0]}-${partes[1]}-${partes[2] || new Date().getFullYear()}`;
    }
    return `EXP-${item.nro_resolucion.replace(/\//g, '-')}`;
  }
  
  // Último recurso: usar ID
  return `EXP-${item.id || index + 1}`;
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'No especificada';
  
  // Intentar formato DD/MM/YYYY
  const partes = fechaStr.split('/');
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  // Intentar formato YYYY-MM-DD
  if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaStr;
  }
  
  return fechaStr;
}

function determinarDepartamento(item) {
  // Intentar deducir el departamento basado en la sala o magistrado
  const sala = item.sala || '';
  const departamentoItem = item.departamento || '';
  
  // Si ya tiene departamento, usarlo
  if (departamentoItem && departamentoItem !== 'No especificado') {
    return departamentoItem;
  }
  
  // Mapear salas a departamentos comunes
  const mapeoSalaDepartamento = {
    'La Paz': ['Plena', 'Constitucional', 'La Paz'],
    'Santa Cruz': ['Santa Cruz'],
    'Cochabamba': ['Cochabamba'],
    'Oruro': ['Oruro'],
    'Potosí': ['Potosí', 'Potosi'],
    'Sucre': ['Sucre'],
    'Tarija': ['Tarija'],
    'Beni': ['Beni'],
    'Pando': ['Pando'],
    'Chuquisaca': ['Chuquisaca']
  };
  
  for (const [departamento, palabrasClave] of Object.entries(mapeoSalaDepartamento)) {
    for (const palabra of palabrasClave) {
      if (sala.toLowerCase().includes(palabra.toLowerCase())) {
        return departamento;
      }
    }
  }
  
  return 'No especificado';
}

function extraerRestrictor(item) {
  // El restrictor está en jurisprudencia[0].restrictor
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].restrictor) {
    return item.jurisprudencia[0].restrictor;
  }
  
  // Si no hay restrictor, intentar con descriptor
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].descriptor) {
    return item.jurisprudencia[0].descriptor;
  }
  
  return null;
}

function extraerSintesis(item) {
  // La síntesis está en jurisprudencia[0].sintesis
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].sintesis) {
    return item.jurisprudencia[0].sintesis;
  }
  
  return null;
}

function extraerRatio(item) {
  // El ratio decidendi está en jurisprudencia[0].ratio
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].ratio) {
    return limpiarContenidoHTML(item.jurisprudencia[0].ratio);
  }
  
  return null;
}

function extraerMaxima(item) {
  // La máxima jurisprudencial está en jurisprudencia[0].maxima
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].maxima) {
    return limpiarContenidoHTML(item.jurisprudencia[0].maxima);
  }
  
  return null;
}

function extraerDescriptor(item) {
  // El descriptor está en jurisprudencia[0].descriptor
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].descriptor) {
    return item.jurisprudencia[0].descriptor;
  }
  
  return null;
}

function extraerPrecedente(item) {
  // El precedente está en jurisprudencia[0].precedente
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].precedente) {
    return limpiarContenidoHTML(item.jurisprudencia[0].precedente);
  }
  
  return null;
}

function extraerTipoJurisprudencia(item) {
  // El tipo está en jurisprudencia[0].tipo_jurisprudencia
  if (item.jurisprudencia && 
      Array.isArray(item.jurisprudencia) && 
      item.jurisprudencia.length > 0 &&
      item.jurisprudencia[0].tipo_jurisprudencia) {
    return item.jurisprudencia[0].tipo_jurisprudencia;
  }
  
  return null;
}

function generarResumenDesdeDatos(item, materia) {
  // Prioridad 1: Sintesis de jurisprudencia
  const sintesis = extraerSintesis(item);
  if (sintesis && sintesis.length > 50) {
    return sintesis;
  }
  
  // Prioridad 2: Restrictor
  const restrictor = extraerRestrictor(item);
  if (restrictor && restrictor.length > 20) {
    return restrictor;
  }
  
  // Prioridad 3: Descriptor
  const descriptor = extraerDescriptor(item);
  if (descriptor && descriptor.length > 20) {
    return descriptor;
  }
  
  // Prioridad 4: Ratio decidendi (primeros 200 chars)
  const ratio = extraerRatio(item);
  if (ratio && ratio.length > 50) {
    return ratio.substring(0, 200) + '...';
  }
  
  // Prioridad 5: Contenido limpio (primeros 200 chars)
  if (item.contenido && item.contenido.length > 50) {
    const contenidoLimpio = limpiarContenidoHTML(item.contenido);
    if (contenidoLimpio.length > 100) {
      return contenidoLimpio.substring(0, 200) + '...';
    }
  }
  
  // Prioridad 6: Crear resumen descriptivo
  const partes = [];
  
  if (item.tipo_resolucion) {
    partes.push(item.tipo_resolucion);
  }
  
  if (materia) {
    partes.push(`sobre ${materia}`);
  }
  
  if (item.formas_resoluciones) {
    partes.push(`declarada ${item.formas_resoluciones.toLowerCase()}`);
  }
  
  if (item.sala) {
    partes.push(`por la ${item.sala}`);
  }
  
  if (item.magistrado) {
    partes.push(`magistrado ${item.magistrado}`);
  }
  
  if (item.fecha_emision) {
    const fecha = formatearFecha(item.fecha_emision);
    partes.push(`emitida el ${fecha}`);
  }
  
  return partes.length > 0 ? partes.join(' ') + '.' : 'Resolución jurisprudencial';
}

function procesarRespuestaTSJ(data, idTema = null, nombre_tema = null, busqueda = null) {
  console.log('🔧 Procesando respuesta API.');
  
  if (!data || !data.success) {
    console.log('⚠️ Respuesta sin éxito o sin datos');
    return [];
  }
  
  let items = [];
  
  if (data.data && data.data.data && Array.isArray(data.data.data)) {
    items = data.data.data;
    console.log(`✅ ${items.length} items encontrados en data.data.data`);
  }
  
  if (items.length === 0) {
    console.log('ℹ️ No se encontraron items');
    return [];
  }
  
  // Verificar si los items tienen jurisprudencia
  const conJurisprudencia = items.filter(item => 
    item.jurisprudencia && Array.isArray(item.jurisprudencia) && item.jurisprudencia.length > 0
  ).length;
  
  console.log(`📊 ${conJurisprudencia} de ${items.length} items tienen jurisprudencia`);
  
  // Mapear a estructura esperada por el frontend
  return items.map((item, index) => {
    // 1. Número de resolución
    const nroResolucion = item.nro_resolucion || 'N/A';
    
    // 2. Expediente
    const expediente = item.nro_expediente || generarExpediente(item, index);
    
    // 3. Fecha
    const fecha = formatearFecha(item.fecha_emision);
    
    // 4. Sala
    const sala = item.sala || 'No especificada';
    
    // 5. Departamento
    const departamento = item.departamento || determinarDepartamento(item);
    
    // 6. Resumen - USAR restrictor/sintesis de jurisprudencia
    const resumen = generarResumenDesdeDatos(item, nombre_tema);
    
    // 7. Materia
    const materia = nombre_tema || item.materia || 'Sin materia especificada';
    
    // 8. Link
    const link = item.link || (item.id ? `https://genesis.tsj.bo/jurisprudencia/${item.id}` : null);
    
    // 9. Extraer datos de jurisprudencia
    const restrictor = extraerRestrictor(item);
    const sintesis = extraerSintesis(item);
    const ratio = extraerRatio(item);
    const maxima = extraerMaxima(item);
    const descriptor = extraerDescriptor(item);
    const precedente = extraerPrecedente(item);
    const tipoJurisprudencia = extraerTipoJurisprudencia(item);
    
    // 10. Datos completos para el frontend
    const datosCompletos = {
      // Campos principales
      id: item.id,
      nro_resolucion: nroResolucion,
      nro_expediente: expediente,
      fecha_emision: fecha,
      sala: sala,
      departamento: departamento,
      resumen: resumen,
      materia: materia,
      
      // Campos adicionales importantes de la API
      tipo_resolucion: item.tipo_resolucion || 'No especificado',
      subtipo_resolucion: item.subtipo_resolucion || 'No especificado',
      magistrado: item.magistrado || 'No especificado',
      forma_resolucion: item.formas_resoluciones || item.forma_resolucion || 'No especificado',
      proceso: item.procesos || item.proceso || 'No especificado',
      
      // Campos de partes
      demandante: item.demandante || 'No especificado',
      demandado: item.demandado || 'No especificado',
      
      // Campos de contenido
      contenido: item.contenido || '',
      contenido_limpio: item.contenido ? limpiarContenidoHTML(item.contenido) : '',
      tiene_html: item.tiene_html || false,
      
      // Campos de jurisprudencia (IMPORTANTE)
      restrictor: restrictor || '',
      sintesis: sintesis || '',
      ratio: ratio || '',
      maxima: maxima || '',
      descriptor: descriptor || '',
      precedente: precedente || '',
      tipo_jurisprudencia: tipoJurisprudencia || 'Jurisprudencia',
      
      // Mantener datos originales de jurisprudencia
      jurisprudencia_data: item.jurisprudencia || [],
      
      // Mantener todos los datos originales
      ...item
    };
    
    return {
      expediente: expediente,
      sala: sala,
      fecha: fecha,
      materia: materia,
      link: link,
      id_tema: idTema,
      resumen: resumen.length > 300 ? resumen.substring(0, 300) + '...' : resumen,
      datos_completos: datosCompletos
    };
  });
}

function procesarDetallesCompletos(item) {
  if (!item) return null;
  
  // Extraer información básica
  const nroResolucion = item.nro_resolucion || 'N/A';
  const expediente = item.nro_expediente || generarExpediente(item, 0);
  const fecha = formatearFecha(item.fecha_emision);
  const sala = item.sala || 'No especificada';
  const departamento = item.departamento || determinarDepartamento(item);
  
  // Extraer datos de jurisprudencia
  const restrictor = extraerRestrictor(item);
  const sintesis = extraerSintesis(item);
  const ratio = extraerRatio(item);
  const maxima = extraerMaxima(item);
  const descriptor = extraerDescriptor(item);
  const precedente = extraerPrecedente(item);
  const tipoJurisprudencia = extraerTipoJurisprudencia(item);
  
  // Generar resumen
  const resumen = generarResumenDesdeDatos(item, item.materia);
  
  // Procesar contenido
  const contenidoLimpio = item.contenido ? limpiarContenidoHTML(item.contenido) : '';
  
  // Extraer considerandos
  function extraerConsiderandos(item) {
    if (!item.contenido) return 'No disponible';
    
    const contenido = item.contenido.toLowerCase();
    const considerandos = [];
    
    // Buscar todos los considerandos
    const regexConsiderandos = /considerando\s+(?:i{1,3}|iv|v|vi|vii|viii|ix|x|[0-9]+)[:\s]*([^<]+?)(?=considerando\s+(?:i{1,3}|iv|v|vi|vii|viii|ix|x|[0-9]+)[:\s]*|$)/gi;
    
    let match;
    while ((match = regexConsiderandos.exec(contenido)) !== null) {
      if (match[1]) {
        considerandos.push(limpiarContenidoHTML(match[1].trim()));
      }
    }
    
    return considerandos.length > 0 ? 
      considerandos.join('\n\n') : 
      'No se identificaron considerandos específicos';
  }
  
  const considerandos = extraerConsiderandos(item);
  
  // Construir objeto completo de detalles
  const detalles = {
    // ===== INFORMACIÓN BÁSICA =====
    id: item.id,
    nro_resolucion: nroResolucion,
    nro_expediente: expediente,
    fecha_emision: fecha,
    fecha_resolucion: fecha,
    sala: sala,
    departamento: departamento,
    
    // ===== MATERIA Y CLASIFICACIÓN =====
    materia: item.materia || 'Sin materia',
    tipo_resolucion: item.tipo_resolucion || 'No especificado',
    subtipo_resolucion: item.subtipo_resolucion || 'No especificado',
    tipo_jurisprudencia: tipoJurisprudencia || 'Jurisprudencia',
    
    // ===== PARTES INVOLUCRADAS =====
    demandante: item.demandante || 'No especificado',
    demandado: item.demandado || 'No especificado',
    magistrado: item.magistrado || 'No especificado',
    
    // ===== RESOLUCIÓN =====
    forma_resolucion: item.formas_resoluciones || 'No especificado',
    proceso: item.procesos || item.proceso || 'No especificado',
    
    // ===== CONTENIDO PRINCIPAL =====
    resumen: resumen,
    contenido: item.contenido || '',
    contenido_limpio: contenidoLimpio,
    tiene_html: item.tiene_html || false,
    
    // ===== JURISPRUDENCIA (RESTRICTOR, SÍNTESIS, ETC) =====
    restrictor: restrictor || '',
    sintesis: sintesis || '',
    ratio: ratio || 'No disponible',
    maxima: maxima || 'No disponible',
    descriptor: descriptor || '',
    precedente: precedente || '',
    considerandos: considerandos,
    
    // ===== INFORMACIÓN ADICIONAL =====
    organo_judicial: item.organo_judicial || sala,
    
    // ===== ENLACES =====
    link: `https://genesis.tsj.bo/jurisprudencia/${item.id}`,
    
    // ===== METADATOS =====
    fecha_publicacion: item.fecha_publicacion || fecha,
    estado: 'Publicado',
    
    // ===== DATOS ORIGINALES PARA REFERENCIA =====
    datos_originales: {
      jurisprudencia: item.jurisprudencia || []
    }
  };
  
  return detalles;
}

function obtenerDatosSimuladosFallback(id_tema, nombre_tema, page) {
  console.log(`🔄 Usando datos simulados como fallback para tema ${id_tema}`);
  
  const baseCasos = [
    {
      id: `${id_tema}-${page}-001`,
      nro_resolucion: `AS-S1-2023-${String(page).padStart(5, '0')}`,
      fecha_emision: "2023-11-15",
      sala: "Primera Sala Constitucional",
      tipo_resolucion: "Sentencia",
      magistrado: "Dra. María Rodríguez",
      formas_resoluciones: "FUNDADO",
      materia: nombre_tema || "Derecho de Familia",
      jurisprudencia: [
        {
          restrictor: "Aplicación de principios de derecho de familia",
          sintesis: "Resolución sobre pensión alimenticia que establece criterios para el cálculo basado en capacidad económica real.",
          ratio: "El derecho a alimentos es de orden público y persiste aún después del divorcio.",
          maxima: "La pensión alimenticia es un derecho fundamental que garantiza la subsistencia.",
          descriptor: "Derecho de Familia / Alimentos / Pensión alimenticia",
          tipo_jurisprudencia: "Reiteradora"
        }
      ]
    }
  ];
  
  return baseCasos.map(caso => {
    const expediente = `EXP-${id_tema}-2023-${String(page).padStart(3, '0')}${caso.id.slice(-3)}`;
    const fecha = formatearFecha(caso.fecha_emision);
    const departamento = determinarDepartamento(caso);
    const resumen = generarResumenDesdeDatos(caso, nombre_tema);
    
    return {
      expediente: expediente,
      sala: caso.sala,
      fecha: fecha,
      materia: caso.materia,
      link: null,
      id_tema: id_tema,
      resumen: resumen,
      datos_completos: {
        ...caso,
        nro_expediente: expediente,
        fecha_emision: fecha,
        departamento: departamento,
        resumen: resumen,
        forma_resolucion: caso.formas_resoluciones,
        proceso: "Proceso de ejemplo",
        tipo_jurisprudencia: "Jurisprudencia"
      }
    };
  });
}

// ========================
// RUTA RAIZ PARA DIAGNÓSTICO
// ========================

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API de Jurisprudencia TSJ Bolivia",
    version: "2.0.0",
    nueva_api: "https://apigenesis.tsj.bo/api/v1/",
    endpoints: {
      consulta_materia: "GET /api/jurisprudencia/tema/:id?nombre=:nombre&page=:page",
      busqueda_texto: "GET /api/jurisprudencia/buscar?query=:texto&page=:page",
      detalles: "GET /api/jurisprudencia/detalles/:id",
      test_jurisprudencia: "GET /api/jurisprudencia/test-jurisprudencia/:id",
      jurisprudencias_local: "GET /api/jurisprudencia/jurisprudencias",
      crear_jurisprudencia: "POST /api/jurisprudencia/jurisprudencias",
      importar_tsj: "POST /api/jurisprudencia/jurisprudencias/importar",
      verificar_existencia: "GET /api/jurisprudencia/jurisprudencias/verificar?expediente=:exp",
      buscar_local: "GET /api/jurisprudencia/jurisprudencias/buscar?q=:texto",
      obtener_por_id: "GET /api/jurisprudencia/jurisprudencias/:id",
      editar: "PUT /api/jurisprudencia/jurisprudencias/:id",
      eliminar: "DELETE /api/jurisprudencia/jurisprudencias/:id",
      health_check: "GET /api/jurisprudencia/health",
      test: "GET /api/jurisprudencia/test"
    }
  });
});

// ========================
// RUTAS PARA CONSULTA TSJ
// ========================

// Ruta para obtener jurisprudencia por tema
router.get("/tema/:id_tema", async (req, res) => {
  try {
    const idTema = parseInt(req.params.id_tema);
    const nombre_tema = req.query.nombre || "";
    const pagina = parseInt(req.query.page) || 1;
    const limit = 20;
    
    console.log(`📥 Consultando tema ${idTema} (${nombre_tema}), página ${pagina}`);

    const params = {
      idTema: idTema,
      paginate: {
        page: pagina,
        limit: limit
      }
    };
    
    const data = await buscarEnTSJ(params);
    
    if (!data || !data.success) {
      throw new Error(data?.message || 'La API no devolvió datos exitosos');
    }
    
    // Procesar la respuesta
    const resultados = procesarRespuestaTSJ(data, idTema, nombre_tema);
    
    // Extraer metadatos
    const total = data.data?.meta?.total || data.data?.meta?.totalItems || resultados.length;
    const totalPages = data.data?.meta?.totalPages || Math.ceil(total / limit) || 1;
    
    // Estadísticas sobre jurisprudencia
    const conJurisprudencia = resultados.filter(r => r.datos_completos.restrictor).length;
    
    res.json({
      success: true,
      data: resultados,
      metadata: {
        page: pagina,
        total_pages: totalPages,
        count: resultados.length,
        total: total,
        tema: { 
          id: idTema, 
          nombre: nombre_tema 
        },
        source: "api_tsj_real",
        api_info: {
          success: data.success,
          message: data.message,
          pagination: data.data?.meta,
          jurisprudencia_stats: {
            con_restrictor: conJurisprudencia,
            sin_restrictor: resultados.length - conJurisprudencia,
            porcentaje: Math.round((conJurisprudencia / resultados.length) * 100) || 0
          }
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Error en consulta tema:", error.message);
    
    res.json({
      success: true,
      data: obtenerDatosSimuladosFallback(
        parseInt(req.params.id_tema),
        req.query.nombre || "",
        parseInt(req.query.page) || 1
      ),
      metadata: {
        page: parseInt(req.query.page) || 1,
        total_pages: 1,
        count: 0,
        total: 0,
        tema: { 
          id: parseInt(req.params.id_tema), 
          nombre: req.query.nombre || "" 
        },
        source: "fallback_simulado",
        warning: `API TSJ: ${error.message}`
      }
    });
  }
});

// Ruta para búsqueda por texto
router.get("/buscar", async (req, res) => {
  try {
    const { q, query, page = 1 } = req.query;
    const searchQuery = q || query;
    const limit = 20;
    
    if (!searchQuery || searchQuery.trim() === '') {
      return res.status(400).json({
        success: false,
        error: "Parámetro de búsqueda requerido"
      });
    }
    
    console.log(`🔍 Búsqueda por texto: "${searchQuery}", página ${page}`);

    // Parámetros para búsqueda por texto
    const params = {
      texto: searchQuery,
      paginate: {
        page: parseInt(page),
        limit: limit
      }
    };
    
    const data = await buscarEnTSJ(params);
    
    if (!data || !data.success) {
      throw new Error(data?.message || 'Búsqueda sin resultados');
    }
    
    const resultados = procesarRespuestaTSJ(data, null, null, searchQuery);
    
    res.json({
      success: true,
      data: resultados,
      metadata: {
        query: searchQuery,
        page: parseInt(page),
        count: resultados.length,
        total: data.data?.meta?.total || resultados.length,
        total_pages: data.data?.meta?.totalPages || 1,
        source: "api_tsj_real"
      }
    });
    
  } catch (error) {
    console.error("❌ Error en búsqueda:", error.message);
    
    res.json({
      success: true,
      data: [],
      metadata: {
        query: req.query.q || req.query.query || "",
        page: parseInt(req.query.page) || 1,
        count: 0,
        total: 0,
        source: "fallback_busqueda",
        warning: error.message
      }
    });
  }
});

// ========================
// ENDPOINT DE DETALLES COMPLETOS
// ========================

router.get("/detalles/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    console.log(`🔍 Obteniendo detalles completos para ID: ${id}`);
    
    const url = `${TSJ_API_CONFIG.BASE_URL}/jurisprudencia/${id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: TSJ_API_CONFIG.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Detalles obtenidos.');
    
    if (!data || !data.success || !data.data) {
      throw new Error(data?.message || 'No se encontraron detalles');
    }
    
    // Procesar los detalles para el frontend
    const detallesProcesados = procesarDetallesCompletos(data.data);
    
    res.json({
      success: true,
      data: detallesProcesados,
      datos_completos: detallesProcesados
    });
    
  } catch (error) {
    console.error("❌ Error obteniendo detalles:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================
// ENDPOINTS DE DIAGNÓSTICO
// ========================

router.get("/test-jurisprudencia/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    console.log(`🧪 Probando datos de jurisprudencia para ID: ${id}`);
    
    const url = `${TSJ_API_CONFIG.BASE_URL}/jurisprudencia/${id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: TSJ_API_CONFIG.getHeaders()
    });
    
    const data = await response.json();
    
    if (!data || !data.success || !data.data) {
      throw new Error('No se obtuvieron datos');
    }
    
    const item = data.data;
    
    // Extraer datos de jurisprudencia
    const jurisprudenciaInfo = item.jurisprudencia && Array.isArray(item.jurisprudencia) && item.jurisprudencia.length > 0 ?
      {
        tiene_jurisprudencia: true,
        cantidad_items: item.jurisprudencia.length,
        primer_item: {
          restrictor: item.jurisprudencia[0].restrictor || 'No tiene',
          sintesis: item.jurisprudencia[0].sintesis ? item.jurisprudencia[0].sintesis.substring(0, 200) + '...' : 'No tiene',
          ratio: item.jurisprudencia[0].ratio ? item.jurisprudencia[0].ratio.substring(0, 200) + '...' : 'No tiene',
          maxima: item.jurisprudencia[0].maxima || 'No tiene',
          descriptor: item.jurisprudencia[0].descriptor || 'No tiene',
          tipo_jurisprudencia: item.jurisprudencia[0].tipo_jurisprudencia || 'No tiene'
        }
      } : {
        tiene_jurisprudencia: false
      };
    
    // Procesar como para lista
    const paraLista = procesarRespuestaTSJ(
      { success: true, data: { data: [item] } }, 
      null, 
      item.materia
    )[0];
    
    res.json({
      success: true,
      id: id,
      tiene_jurisprudencia: jurisprudenciaInfo.tiene_jurisprudencia,
      jurisprudencia_info: jurisprudenciaInfo,
      procesado_para_lista: {
        expediente: paraLista.expediente,
        sala: paraLista.sala,
        fecha: paraLista.fecha,
        materia: paraLista.materia,
        resumen: paraLista.resumen.substring(0, 150) + '...',
        tiene_restrictor: !!paraLista.datos_completos.restrictor,
        restrictor: paraLista.datos_completos.restrictor ? 
          paraLista.datos_completos.restrictor.substring(0, 100) + '...' : 
          'No tiene'
      },
      campos_disponibles: {
        contenido: item.contenido ? `${item.contenido.length} caracteres` : 'No tiene',
        jurisprudencia: item.jurisprudencia ? `Array[${item.jurisprudencia.length}]` : 'No tiene',
        tiene_html: item.tiene_html || false
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================
// RUTAS PARA BASE LOCAL (MANTENER SIN CAMBIOS)
// ========================

// Listar todas las jurisprudencias locales
router.get("/jurisprudencias", jurisprudenciaController.listarJurisprudencias);

// Verificar si existe una jurisprudencia por expediente
router.get("/jurisprudencias/verificar", jurisprudenciaController.verificarExistencia);

// Buscar jurisprudencias en la base local
router.get("/jurisprudencias/buscar", jurisprudenciaController.buscarJurisprudencias);

// Obtener una jurisprudencia específica por ID
router.get("/jurisprudencias/:id", jurisprudenciaController.obtenerJurisprudenciaPorId);

// Crear una nueva jurisprudencia (local)
router.post("/jurisprudencias", jurisprudenciaController.crearJurisprudencia);

// Importar jurisprudencia desde TSJ
router.post("/jurisprudencias/importar", jurisprudenciaController.importarDesdeTSJ);

// Editar una jurisprudencia existente
router.put("/jurisprudencias/:id", jurisprudenciaController.editarJurisprudencia);

// Eliminar una jurisprudencia
router.delete("/jurisprudencias/:id", jurisprudenciaController.eliminarJurisprudencia);

// ========================
// RUTAS UTILITARIAS
// ========================

// Ruta de health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Módulo de jurisprudencia funcionando",
    timestamp: new Date().toISOString(),
    status: "healthy",
    api_tsj: "conectada",
    version: "2.0.0",
    features: {
      conexion_api: true,
      procesamiento_jurisprudencia: true,
      detalles_completos: true,
      busqueda_texto: true
    }
  });
});

// Ruta de test
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Router de jurisprudencia funcionando correctamente",
    endpoints: {
      raiz: "GET /",
      tema: "GET /tema/:id",
      buscar: "GET /buscar?q=texto",
      detalles: "GET /detalles/:id",
      test_jurisprudencia: "GET /test-jurisprudencia/:id",
      jurisprudencias: "GET /jurisprudencias",
      verificar: "GET /jurisprudencias/verificar?expediente=...",
      buscar_local: "GET /jurisprudencias/buscar?q=...",
      obtener_por_id: "GET /jurisprudencias/:id",
      crear: "POST /jurisprudencias",
      importar: "POST /jurisprudencias/importar",
      editar: "PUT /jurisprudencias/:id",
      eliminar: "DELETE /jurisprudencias/:id",
      health: "GET /health"
    }
  });
});

module.exports = router;