// src/controllers/asistente.controller.js
const pool = require("../db");
const fs = require("fs");
const path = require("path");

// ── Lazy-load modules ──────────────────────────────────────
let _groqClient = null;
function getGroqClient() {
  if (!_groqClient) {
    const Groq = require("groq-sdk");
    _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groqClient;
}

let _pdfParse = null;
async function getPdfParse() {
  if (!_pdfParse) {
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    _pdfParse = mod.default || mod;
  }
  return _pdfParse;
}

let _mammoth = null;
async function getMammoth() {
  if (!_mammoth) {
    const mod = await import("mammoth");
    _mammoth = mod.default || mod;
  }
  return _mammoth;
}

// ── System Prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un asistente virtual legal especializado EXCLUSIVAMENTE en derecho boliviano. Tu nombre es "Asistente Legal IUS PUNIENDI".

REGLAS ESTRICTAS:
1. Solo respondes preguntas relacionadas con el derecho y la legislación boliviana.
2. Si te preguntan sobre cualquier tema que NO sea legal o jurídico boliviano, responde cortésmente: "Lo siento, solo puedo asistirte con consultas relacionadas al derecho boliviano. Por favor, realiza una pregunta dentro del ámbito legal."
3. Actúas como un abogado profesional boliviano con amplio conocimiento de:
   - Código Penal Boliviano
   - Código de Procedimiento Penal
   - Código Civil Boliviano
   - Código de Procedimiento Civil
   - Código de Familia y Proceso Familiar
   - Código Niña, Niño y Adolescente
   - Ley General del Trabajo
   - Código de Comercio
   - Constitución Política del Estado Plurinacional de Bolivia
   - Ley del Órgano Judicial
   - Ley de Sustancias Controladas
   - Ley Integral para Garantizar a las Mujeres una Vida Libre de Violencia (Ley 348)
   - Ley de Lucha Contra la Corrupción (Ley 004)
   - Y toda la legislación boliviana vigente
4. Proporcionas información actualizada y precisa, citando artículos y leyes cuando sea posible.
5. Si analizas documentos, solo trabajas con documentos de naturaleza jurídica/legal. Si un documento NO es jurídico, responde: "El documento proporcionado no parece ser de naturaleza jurídica. Solo puedo analizar documentos legales como demandas, contratos, sentencias, resoluciones, memoriales y otros documentos del ámbito legal boliviano."
6. Al dar recomendaciones, siempre aclara que son orientativas y que el usuario debe consultar con un abogado en persona para tomar decisiones legales definitivas.
7. Responde siempre en español.
8. Sé profesional, claro y conciso en tus respuestas.`;

// ── Helpers ────────────────────────────────────────────────

// Extraer texto de un archivo según su tipo
async function extraerTextoArchivo(rutaArchivo, mimeType) {
  const rutaAbsoluta = path.join(__dirname, '..', rutaArchivo.replace(/^\//, ''));

  if (!fs.existsSync(rutaAbsoluta)) {
    throw new Error(`Archivo no encontrado: ${rutaArchivo}`);
  }

  const buffer = fs.readFileSync(rutaAbsoluta);

  // PDF
  if (mimeType === 'application/pdf' || rutaArchivo.toLowerCase().endsWith('.pdf')) {
    const pdfParse = await getPdfParse();
    const data = await pdfParse(buffer);
    return data.text;
  }

  // DOCX
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    rutaArchivo.toLowerCase().endsWith('.docx') ||
    rutaArchivo.toLowerCase().endsWith('.doc')
  ) {
    const mammoth = await getMammoth();
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // TXT
  if (mimeType === 'text/plain' || rutaArchivo.toLowerCase().endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  // Imágenes u otros - no se puede extraer texto
  throw new Error('Tipo de archivo no soportado para extracción de texto. Solo se aceptan PDF, DOCX y TXT.');
}

// Extraer texto de un archivo subido via multer
async function extraerTextoArchivoSubido(file) {
  const buffer = fs.readFileSync(file.path);
  const mimeType = file.mimetype;

  if (mimeType === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const pdfParse = await getPdfParse();
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    file.originalname.toLowerCase().endsWith('.docx') ||
    file.originalname.toLowerCase().endsWith('.doc')
  ) {
    const mammoth = await getMammoth();
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  throw new Error('Tipo de archivo no soportado. Solo se aceptan PDF, DOCX y TXT.');
}

// Llamar a la API de Groq (Llama 3.3)
async function llamarIA(messages) {
  const groq = getGroqClient();

  // Filtrar mensajes del asistente que son internos (saludos del frontend)
  const cleanMessages = messages.filter(m => m.content && m.content.trim());

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...cleanMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ],
    max_tokens: 4096,
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
}

// Obtener datos completos de un caso con sus documentos
async function obtenerDatosCaso(casoId, userId) {
  // Obtener caso
  const casoResult = await pool.query(
    `SELECT 
      c.id, c.nurej_cud, c.delito, c.tipo_caso, c.asunto, 
      c.estado, c.seguimiento, c.materia, c.fecha_ingreso, c.fecha_inicio,
      c.juzgado_nombre, c.juzgado_ubicacion,
      CONCAT(cl.nombre, ' ', cl.apellido_paterno, ' ', cl.apellido_materno) AS cliente,
      CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', u.apellido_materno) AS responsable
    FROM casos c
    LEFT JOIN clientes cl ON c.clientes_id = cl.id
    LEFT JOIN usuarios u ON c.responsable_id = u.id
    WHERE c.id = $1`,
    [casoId]
  );

  if (casoResult.rows.length === 0) {
    throw new Error('Caso no encontrado');
  }

  const caso = casoResult.rows[0];

  // Obtener documentos del caso
  const docsResult = await pool.query(
    `SELECT id, tipo_documento, ruta_archivo, nombre_original, fecha_subida
     FROM documentos WHERE caso_id = $1 ORDER BY fecha_subida DESC`,
    [casoId]
  );

  return { caso, documentos: docsResult.rows };
}

// ── Controllers ────────────────────────────────────────────

/**
 * POST /api/asistente/chat
 * Chat legal libre
 */
const chat = async (req, res) => {
  try {
    const { mensaje, historial } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ message: 'El mensaje es requerido' });
    }

    // Construir historial de mensajes
    const messages = [];
    if (historial && Array.isArray(historial)) {
      historial.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    messages.push({ role: 'user', content: mensaje });

    const respuesta = await llamarIA(messages);

    res.json({
      respuesta,
      tipo: 'chat'
    });
  } catch (error) {
    console.error("Error en chat:", error);
    res.status(500).json({
      message: 'Error al procesar el mensaje',
      error: error.message
    });
  }
};

/**
 * POST /api/asistente/resumir-documento
 * Subir documento para resumir
 */
const resumirDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debe subir un documento (PDF, DOCX o TXT)' });
    }

    const textoDocumento = await extraerTextoArchivoSubido(req.file);

    if (!textoDocumento || textoDocumento.trim().length < 50) {
      return res.status(400).json({
        message: 'No se pudo extraer suficiente texto del documento. Verifique que el archivo no esté vacío o sea una imagen.'
      });
    }

    // Limitar texto a ~12000 caracteres para no exceder tokens
    const textoRecortado = textoDocumento.substring(0, 12000);

    const messages = [
      {
        role: 'user',
        content: `Analiza el siguiente documento jurídico y proporciona:
1. Un RESUMEN EJECUTIVO claro y conciso
2. Los PUNTOS CLAVE del documento
3. Las PARTES INVOLUCRADAS (si se identifican)
4. El TIPO DE DOCUMENTO (demanda, sentencia, contrato, memorial, etc.)
5. Las REFERENCIAS LEGALES mencionadas (artículos, leyes)
6. OBSERVACIONES importantes

Si el documento NO es de naturaleza jurídica/legal, indica que solo puedes analizar documentos legales.

DOCUMENTO:
${textoRecortado}${textoDocumento.length > 12000 ? '\n\n[... documento truncado por extensión ...]' : ''}`
      }
    ];

    const respuesta = await llamarIA(messages);

    // Limpiar archivo temporal
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      respuesta,
      tipo: 'resumen_documento',
      nombreArchivo: req.file.originalname
    });
  } catch (error) {
    console.error("Error en resumirDocumento:", error);
    // Limpiar archivo si hubo error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      message: 'Error al resumir el documento',
      error: error.message
    });
  }
};

/**
 * POST /api/asistente/resumir-caso/:casoId
 * Resumir caso guardado con todos sus documentos
 */
const resumirCaso = async (req, res) => {
  try {
    const { casoId } = req.params;
    const userId = req.user.id;

    const { caso, documentos } = await obtenerDatosCaso(casoId, userId);

    // Construir contexto del caso
    let contextoCaso = `DATOS DEL CASO:
- NUREJ/CUD: ${caso.nurej_cud || 'No asignado'}
- Delito/Materia: ${caso.delito || 'No especificado'}
- Tipo de caso: ${caso.tipo_caso || 'No especificado'}
- Asunto: ${caso.asunto || 'No especificado'}
- Estado: ${caso.estado || 'No especificado'}
- Materia: ${caso.materia || 'No especificada'}
- Seguimiento: ${caso.seguimiento || 'No especificado'}
- Fecha ingreso: ${caso.fecha_ingreso || 'No especificada'}
- Fecha inicio: ${caso.fecha_inicio || 'No especificada'}
- Juzgado: ${caso.juzgado_nombre || 'No asignado'} ${caso.juzgado_ubicacion ? `(${caso.juzgado_ubicacion})` : ''}
- Cliente: ${caso.cliente || 'No asignado'}
- Responsable: ${caso.responsable || 'No asignado'}`;

    // Intentar extraer texto de los documentos asociados
    let textosDocumentos = '';
    let docsLeidos = 0;

    for (const doc of documentos) {
      try {
        const texto = await extraerTextoArchivo(doc.ruta_archivo, doc.tipo_documento);
        if (texto && texto.trim().length > 0) {
          // Limitar cada documento a 4000 chars
          const textoRecortado = texto.substring(0, 4000);
          textosDocumentos += `\n\n--- DOCUMENTO: ${doc.nombre_original} (${doc.fecha_subida}) ---\n${textoRecortado}`;
          docsLeidos++;
          if (docsLeidos >= 5) break; // Máximo 5 documentos
        }
      } catch (err) {
        console.log(`No se pudo leer documento ${doc.nombre_original}:`, err.message);
      }
    }

    const prompt = `Analiza y resume el siguiente caso legal boliviano. Proporciona:
1. RESUMEN EJECUTIVO del caso
2. ESTADO ACTUAL y etapa procesal
3. PARTES INVOLUCRADAS
4. HECHOS PRINCIPALES
5. FUNDAMENTOS LEGALES aplicables (cita artículos y leyes bolivianas)
6. PRÓXIMOS PASOS recomendados
7. OBSERVACIONES IMPORTANTES

${contextoCaso}
${textosDocumentos ? `\nDOCUMENTOS ASOCIADOS (${docsLeidos} de ${documentos.length}):${textosDocumentos}` : '\nNo hay documentos asociados a este caso.'}`;

    const messages = [{ role: 'user', content: prompt }];
    const respuesta = await llamarIA(messages);

    res.json({
      respuesta,
      tipo: 'resumen_caso',
      casoId: caso.id,
      casoNurej: caso.nurej_cud,
      documentosAnalizados: docsLeidos,
      totalDocumentos: documentos.length
    });
  } catch (error) {
    console.error("Error en resumirCaso:", error);
    res.status(500).json({
      message: 'Error al resumir el caso',
      error: error.message
    });
  }
};

/**
 * POST /api/asistente/recomendar-caso/:casoId
 * Dar recomendaciones legales para un caso guardado
 */
const recomendarCaso = async (req, res) => {
  try {
    const { casoId } = req.params;
    const userId = req.user.id;

    const { caso, documentos } = await obtenerDatosCaso(casoId, userId);

    let contextoCaso = `DATOS DEL CASO:
- NUREJ/CUD: ${caso.nurej_cud || 'No asignado'}
- Delito/Materia: ${caso.delito || 'No especificado'}
- Tipo de caso: ${caso.tipo_caso || 'No especificado'}
- Asunto: ${caso.asunto || 'No especificado'}
- Estado: ${caso.estado || 'No especificado'}
- Materia: ${caso.materia || 'No especificada'}
- Seguimiento: ${caso.seguimiento || 'No especificado'}
- Fecha ingreso: ${caso.fecha_ingreso || 'No especificada'}
- Juzgado: ${caso.juzgado_nombre || 'No asignado'}
- Cliente: ${caso.cliente || 'No asignado'}
- Responsable: ${caso.responsable || 'No asignado'}`;

    // Leer documentos
    let textosDocumentos = '';
    let docsLeidos = 0;
    for (const doc of documentos) {
      try {
        const texto = await extraerTextoArchivo(doc.ruta_archivo, doc.tipo_documento);
        if (texto && texto.trim().length > 0) {
          textosDocumentos += `\n\n--- DOCUMENTO: ${doc.nombre_original} ---\n${texto.substring(0, 4000)}`;
          docsLeidos++;
          if (docsLeidos >= 5) break;
        }
      } catch (err) {
        console.log(`No se pudo leer documento ${doc.nombre_original}:`, err.message);
      }
    }

    const prompt = `Como abogado experto en derecho boliviano, analiza el siguiente caso y proporciona RECOMENDACIONES LEGALES detalladas:

1. ANÁLISIS DE LA SITUACIÓN ACTUAL del caso
2. ESTRATEGIA LEGAL RECOMENDADA
3. ACCIONES INMEDIATAS que debe tomar el abogado
4. PLAZOS PROCESALES a considerar (según la legislación boliviana)
5. RECURSOS LEGALES disponibles (apelación, casación, amparo, etc.)
6. JURISPRUDENCIA RELEVANTE (si aplica)
7. RIESGOS Y CONTINGENCIAS a considerar
8. DOCUMENTOS O PRUEBAS adicionales que se deberían recabar

IMPORTANTE: Cita artículos y leyes bolivianas específicas que fundamenten tus recomendaciones.

${contextoCaso}
${textosDocumentos ? `\nDOCUMENTOS DEL CASO:${textosDocumentos}` : '\nNo hay documentos asociados.'}`;

    const messages = [{ role: 'user', content: prompt }];
    const respuesta = await llamarIA(messages);

    res.json({
      respuesta,
      tipo: 'recomendacion_caso',
      casoId: caso.id,
      casoNurej: caso.nurej_cud,
      documentosAnalizados: docsLeidos
    });
  } catch (error) {
    console.error("Error en recomendarCaso:", error);
    res.status(500).json({
      message: 'Error al generar recomendaciones',
      error: error.message
    });
  }
};

/**
 * POST /api/asistente/analizar-documento
 * Subir documento para analizar caso y dar recomendación
 */
const analizarDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debe subir un documento (PDF, DOCX o TXT)' });
    }

    const textoDocumento = await extraerTextoArchivoSubido(req.file);

    if (!textoDocumento || textoDocumento.trim().length < 50) {
      return res.status(400).json({
        message: 'No se pudo extraer suficiente texto del documento.'
      });
    }

    const textoRecortado = textoDocumento.substring(0, 12000);

    const prompt = `Analiza el siguiente documento jurídico como un abogado experto boliviano y proporciona:

1. TIPO DE DOCUMENTO identificado
2. RESUMEN del contenido
3. ANÁLISIS LEGAL detallado
4. FORTALEZAS del documento/caso
5. DEBILIDADES o puntos vulnerables
6. RECOMENDACIONES ESTRATÉGICAS
7. ARTÍCULOS Y LEYES BOLIVIANAS aplicables
8. PRÓXIMOS PASOS sugeridos
9. PLAZOS PROCESALES relevantes

Si el documento NO es de naturaleza jurídica/legal, indica que solo puedes analizar documentos legales.

DOCUMENTO:
${textoRecortado}${textoDocumento.length > 12000 ? '\n\n[... documento truncado por extensión ...]' : ''}`;

    const messages = [{ role: 'user', content: prompt }];
    const respuesta = await llamarIA(messages);

    // Limpiar archivo temporal
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      respuesta,
      tipo: 'analisis_documento',
      nombreArchivo: req.file.originalname
    });
  } catch (error) {
    console.error("Error en analizarDocumento:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      message: 'Error al analizar el documento',
      error: error.message
    });
  }
};

/**
 * GET /api/asistente/casos
 * Listar casos del usuario para seleccionar en el asistente
 */
const listarCasosUsuario = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        c.id, c.nurej_cud, c.delito, c.tipo_caso, c.asunto, 
        c.estado, c.materia, c.juzgado_nombre,
        CONCAT(cl.nombre, ' ', cl.apellido_paterno) AS cliente,
        (SELECT COUNT(*) FROM documentos d WHERE d.caso_id = c.id) AS total_documentos
      FROM casos c
      LEFT JOIN clientes cl ON c.clientes_id = cl.id
      ORDER BY c.id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error en listarCasosUsuario:", error);
    res.status(500).json({
      message: 'Error al listar casos',
      error: error.message
    });
  }
};

module.exports = {
  chat,
  resumirDocumento,
  resumirCaso,
  recomendarCaso,
  analizarDocumento,
  listarCasosUsuario
};
