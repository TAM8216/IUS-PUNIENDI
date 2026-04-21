// src/controllers/documentos.controller.js - VERSIÓN COMPLETA Y CORREGIDA
const pool = require("../db");
const fs = require("fs");
const path = require("path");

// 📋 LISTAR DOCUMENTOS POR CASO
const listarDocumentos = async (req, res, next) => {
  try {
    const { caso_id } = req.params;
    console.log("🔍 Listando documentos para caso:", caso_id);

    const result = await pool.query(
      `SELECT id, caso_id, tipo_documento, ruta_archivo, fecha_subida, nombre_original
       FROM documentos
       WHERE caso_id = $1
       ORDER BY fecha_subida DESC`,
      [caso_id]
    );
    
    console.log(`✅ Encontrados ${result.rows.length} documentos para caso ${caso_id}`);
    
    // 🔥 Asegurar que las rutas estén limpias
    const documentosLimpios = result.rows.map(doc => ({
      ...doc,
      ruta_archivo: doc.ruta_archivo?.replace(/\\/g, '/') || doc.ruta_archivo
    }));
    
    res.json(documentosLimpios);
  } catch (error) {
    console.error("❌ Error en listarDocumentos:", error);
    res.status(500).json({ 
      message: 'Error al obtener documentos',
      error: error.message 
    });
  }
};

// ➕ SUBIR DOCUMENTO - VERSIÓN ESTABLE
const subirDocumento = async (req, res, next) => {
  console.log("=== 🚀 INICIANDO SUBIDA DE DOCUMENTO ===");
  
  try {
    const { caso_id } = req.params;
    const archivo = req.file;

    console.log("📋 Parámetros caso_id:", caso_id);
    console.log("👤 Usuario autenticado:", req.user?.id);
    console.log("📄 Archivo recibido:", {
      originalname: archivo?.originalname,
      mimetype: archivo?.mimetype,
      size: archivo?.size,
      path: archivo?.path
    });

    // Validaciones básicas
    if (!archivo) {
      console.log("❌ No se recibió archivo");
      return res.status(400).json({ message: "Archivo requerido" });
    }

    if (!req.user || !req.user.id) {
      console.log("❌ Usuario no autenticado");
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!caso_id) {
      console.log("❌ caso_id es requerido");
      return res.status(400).json({ message: "ID del caso es requerido" });
    }

    console.log("✅ Todas las validaciones pasadas");

    // 🔥 CORRECCIÓN: Guardar ruta RELATIVA de forma segura
    const rutaCompleta = archivo.path;
    console.log("📍 Ruta completa del archivo:", rutaCompleta);

    // Extraer solo la parte después de "uploads"
    let rutaParaBD;
    if (rutaCompleta.includes('uploads')) {
      const partes = rutaCompleta.split('uploads');
      rutaParaBD = `/uploads${partes[1]}`.replace(/\\/g, '/');
    } else {
      // Fallback: usar la ruta relativa desde src
      const rutaRelativa = path.relative(path.join(__dirname, '..'), rutaCompleta);
      rutaParaBD = `/${rutaRelativa.replace(/\\/g, '/')}`;
    }

    console.log("📍 Ruta para guardar en BD:", rutaParaBD);

    // 🔥 INSERTAR EN BD - VERSIÓN SEGURA
    console.log("💾 Insertando documento en la base de datos...");
    
    const query = `
      INSERT INTO documentos (caso_id, tipo_documento, ruta_archivo, fecha_subida, nombre_original)
      VALUES ($1, $2, $3, NOW(), $4) 
      RETURNING id, caso_id, tipo_documento, ruta_archivo, fecha_subida, nombre_original
    `;
    
    const values = [caso_id, archivo.mimetype, rutaParaBD, archivo.originalname];
    
    console.log("📊 Ejecutando query:", query);
    console.log("📊 Valores:", values);

    const result = await pool.query(query, values);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('No se pudo recuperar el documento insertado');
    }

    const nuevoDoc = result.rows[0];
    console.log("✅ Documento guardado exitosamente. ID:", nuevoDoc.id);

    // 🔥 PREPARAR RESPUESTA LIMPIA
    const respuesta = {
      success: true,
      id: nuevoDoc.id,
      caso_id: nuevoDoc.caso_id,
      tipo_documento: nuevoDoc.tipo_documento,
      ruta_archivo: nuevoDoc.ruta_archivo,
      fecha_subida: nuevoDoc.fecha_subida,
      nombre_original: nuevoDoc.nombre_original,
      message: "Documento subido correctamente"
    };

    console.log("📤 Enviando respuesta al frontend:", respuesta);
    
    res.status(201).json(respuesta);

  } catch (error) {
    console.error("❌ ERROR CRÍTICO en subirDocumento:");
    console.error("❌ Mensaje:", error.message);
    console.error("❌ Stack:", error.stack);
    
    // 🔥 RESPUESTA DE ERROR CLARA
    const errorResponse = {
      success: false,
      message: 'Error al subir documento',
      error: error.message
    };
    
    // Solo incluir stack en desarrollo
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }
    
    res.status(500).json(errorResponse);
  }
};

// ❌ ELIMINAR DOCUMENTO
const eliminarDocumento = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Eliminando documento ID:", id);

    // 1. Primero obtener la información del documento
    const docResult = await pool.query(
      "SELECT * FROM documentos WHERE id = $1",
      [id]
    );

    if (docResult.rows.length === 0) {
      console.log("❌ Documento no encontrado:", id);
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    const documento = docResult.rows[0];
    console.log("📄 Documento a eliminar:", documento.nombre_original);
    console.log("📍 Ruta del archivo:", documento.ruta_archivo);

    // 2. Eliminar de la base de datos
    const deleteResult = await pool.query(
      "DELETE FROM documentos WHERE id = $1 RETURNING *",
      [id]
    );

    console.log("✅ Documento eliminado de la BD");

    // 3. Eliminar archivo físico
    if (documento.ruta_archivo) {
      try {
        const rutaAbsoluta = path.join(__dirname, '..', documento.ruta_archivo);
        if (fs.existsSync(rutaAbsoluta)) {
          fs.unlinkSync(rutaAbsoluta);
          console.log("✅ Archivo físico eliminado:", rutaAbsoluta);
        } else {
          console.log("⚠️ Archivo físico no encontrado, pero se eliminó de la BD");
        }
      } catch (fileError) {
        console.error("⚠️ Error eliminando archivo físico:", fileError.message);
        // Continuar aunque falle la eliminación del archivo físico
      }
    }

    res.sendStatus(204);
    
  } catch (error) {
    console.error("❌ Error en eliminarDocumento:", error);
    res.status(500).json({ 
      message: 'Error al eliminar documento',
      error: error.message 
    });
  }
};

// 🔧 FUNCIÓN TEMPORAL PARA CORREGIR RUTAS EXISTENTES
const corregirRutasDocumentos = async (req, res) => {
  try {
    console.log("🛠️ Corrigiendo rutas de documentos existentes...");
    
    const todosDocumentos = await pool.query("SELECT id, ruta_archivo FROM documentos");
    let corregidos = 0;
    
    for (const doc of todosDocumentos.rows) {
      const rutaVieja = doc.ruta_archivo;
      let rutaNueva = rutaVieja;
      
      // Corregir rutas absolutas de Windows
      if (rutaVieja.includes('C:\\') || rutaVieja.includes('C:/')) {
        // Extraer solo la parte después de "uploads"
        if (rutaVieja.includes('uploads')) {
          const partes = rutaVieja.split('uploads');
          rutaNueva = `/uploads${partes[1]}`.replace(/\\/g, '/');
        }
      }
      
      // Corregir backslashes
      rutaNueva = rutaNueva.replace(/\\/g, '/');
      
      if (rutaNueva !== rutaVieja) {
        console.log(`🔄 Corrigiendo documento ${doc.id}:`);
        console.log(`   Vieja: ${rutaVieja}`);
        console.log(`   Nueva: ${rutaNueva}`);
        
        await pool.query(
          "UPDATE documentos SET ruta_archivo = $1 WHERE id = $2",
          [rutaNueva, doc.id]
        );
        corregidos++;
      }
    }
    
    console.log(`✅ ${corregidos} rutas corregidas correctamente`);
    res.json({ 
      message: "Rutas corregidas correctamente",
      documentos_corregidos: corregidos 
    });
    
  } catch (error) {
    console.error("❌ Error corrigiendo rutas:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  listarDocumentos, 
  subirDocumento, 
  eliminarDocumento,
  corregirRutasDocumentos // 🔧 Función temporal
};