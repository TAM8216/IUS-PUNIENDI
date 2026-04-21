// src/controllers/casos.controller.js
const pool = require("../db");
const fs = require("fs");
const path = require("path");

// Lista todos los casos
const ListaCasos = async (req, res, next) => {
  try {
    console.log("🔍 Ejecutando ListaCasos...");
    
    const queryText = `
      SELECT 
        c.id, 
        c.nurej_cud, 
        c.delito, 
        c.tipo_caso, 
        c.asunto, 
        c.estado,
        c.seguimiento,
        c.juzgado_nombre,
        c.juzgado_ubicacion,
        CONCAT(cl.nombre, ' ', cl.apellido_paterno, ' ', cl.apellido_materno) AS cliente,
        c.clientes_id,
        c.responsable_id,
        CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', u.apellido_materno) AS responsable_nombre_completo,
        u.nombre as responsable_nombre,
        u.apellido_paterno as responsable_apellido_paterno,
        u.apellido_materno as responsable_apellido_materno
      FROM casos c
      LEFT JOIN clientes cl ON c.clientes_id = cl.id
      LEFT JOIN usuarios u ON c.responsable_id = u.id
      ORDER BY c.id DESC;
    `;
    
    const result = await pool.query(queryText);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en ListaCasos:", error);
    res.status(500).json({ message: 'Error al obtener casos', error: error.message });
  }
};

// Obtener un caso por id
const Caso = async (req, res, next) => {
  try {
    if (!req.params || !req.params.id) {
      return res.status(400).json({ message: "ID del caso es requerido" });
    }
    
    const id = req.params.id;

    const queryText = `
      SELECT 
        c.id, 
        c.nurej_cud, 
        c.delito, 
        c.tipo_caso, 
        c.asunto, 
        c.estado, 
        c.seguimiento,
        c.juzgado_nombre,
        c.juzgado_ubicacion,
        cl.nombre AS cliente,
        c.fecha_ingreso,
        c.fecha_inicio,
        c.materia,
        c.creado_por,
        c.clientes_id,
        c.responsable_id,
        CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', u.apellido_materno) AS responsable_nombre_completo,
        u.nombre as responsable_nombre,
        u.apellido_paterno as responsable_apellido_paterno,
        u.apellido_materno as responsable_apellido_materno
      FROM casos c
      LEFT JOIN clientes cl ON c.clientes_id = cl.id
      LEFT JOIN usuarios u ON c.responsable_id = u.id
      WHERE c.id = $1
    `;
    
    const result = await pool.query(queryText, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Caso no encontrado" });
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error("❌ Error obteniendo caso:", error);
    res.status(500).json({ message: 'Error al obtener caso', error: error.message });
  }
};

// Crear un caso
const CrearCaso = async (req, res, next) => {
  try {
    const {
      nurej_cud, 
      delito, 
      tipo_caso, 
      asunto,
      fecha_ingreso, 
      fecha_inicio, 
      materia,
      creado_por, 
      clientes_id, 
      estado, 
      responsable_id,
      seguimiento,
      juzgado_nombre,
      juzgado_ubicacion
    } = req.body;

    if (!delito || !tipo_caso || !asunto) {
      return res.status(400).json({ message: 'Los campos delito, tipo_caso y asunto son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO casos (
        nurej_cud, delito, tipo_caso, asunto, 
        fecha_ingreso, fecha_inicio, materia, 
        creado_por, clientes_id, 
        estado, responsable_id, seguimiento,
        juzgado_nombre, juzgado_ubicacion
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        nurej_cud || null, 
        delito, 
        tipo_caso, 
        asunto, 
        fecha_ingreso || null, 
        fecha_inicio || null, 
        materia || null,
        creado_por || null, 
        clientes_id || null, 
        estado || 'activo', 
        responsable_id || null,
        seguimiento || 'NT-1',
        juzgado_nombre || null,
        juzgado_ubicacion || null
      ]
    );

    const nuevoCaso = result.rows[0];
    res.status(201).json(nuevoCaso);
    
  } catch (error) {
    console.error("❌ Error en CrearCaso:", error);
    res.status(500).json({ message: 'Error al crear caso', error: error.message });
  }
};

// Controlador para traspasar casos
const TrasladarCasos = async (req, res) => {
  const { caso_ids, nuevo_responsable_id, comentario, realizado_por_id } = req.body;

  try {
    // Validaciones
    if (!caso_ids || !Array.isArray(caso_ids) || caso_ids.length === 0) {
      return res.status(400).json({ 
        message: "Debe proporcionar una lista de casos a traspasar" 
      });
    }

    if (!nuevo_responsable_id) {
      return res.status(400).json({ 
        message: "Debe especificar el nuevo responsable" 
      });
    }

    // Verificar que el nuevo responsable existe
    const nuevoResponsable = await pool.query(
      'SELECT id, nombre, apellido_paterno, apellido_materno FROM usuarios WHERE id = $1',
      [nuevo_responsable_id]
    );

    if (nuevoResponsable.rows.length === 0) {
      return res.status(404).json({ 
        message: "El nuevo responsable no existe" 
      });
    }

    // Verificar que todos los casos existen y obtener información del responsable actual
    const casosExistentes = await pool.query(
      `SELECT c.id, c.nurej_cud, c.delito, c.responsable_id, 
              u.nombre as responsable_nombre, u.apellido_paterno as responsable_apellido
       FROM casos c
       LEFT JOIN usuarios u ON c.responsable_id = u.id
       WHERE c.id = ANY($1)`,
      [caso_ids]
    );

    if (casosExistentes.rows.length !== caso_ids.length) {
      const idsExistentes = casosExistentes.rows.map(c => c.id);
      const idsNoExistentes = caso_ids.filter(id => !idsExistentes.includes(id));
      
      return res.status(404).json({ 
        message: "Algunos casos no existen",
        casos_no_encontrados: idsNoExistentes
      });
    }

    // Actualizar cada caso
    const resultados = [];
    const casosActualizados = [];

    for (const casoId of caso_ids) {
      try {
        // Obtener información del caso antes de actualizar
        const casoAntes = casosExistentes.rows.find(c => c.id === casoId);

        // Actualizar el responsable del caso
        const result = await pool.query(
          `UPDATE casos 
           SET responsable_id = $1, 
               actualizado_en = CURRENT_TIMESTAMP
           WHERE id = $2 
           RETURNING id, nurej_cud, delito, responsable_id`,
          [nuevo_responsable_id, casoId]
        );

        if (result.rows.length > 0) {
          // Registrar el traspaso en el historial
          await pool.query(
            `INSERT INTO historial_casos 
             (caso_id, accion, detalles, realizado_por_id, creado_en) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [
              casoId,
              'TRASPASO',
              JSON.stringify({
                responsable_anterior_id: casoAntes.responsable_id,
                responsable_anterior_nombre: casoAntes.responsable_nombre ? 
                  `${casoAntes.responsable_nombre} ${casoAntes.responsable_apellido}` : 
                  'No asignado',
                responsable_nuevo_id: nuevo_responsable_id,
                responsable_nuevo_nombre: `${nuevoResponsable.rows[0].nombre} ${nuevoResponsable.rows[0].apellido_paterno}`,
                comentario: comentario || 'Sin comentario',
                fecha: new Date().toISOString()
              }),
              realizado_por_id || req.user?.id || null
            ]
          );

          resultados.push({
            caso_id: casoId,
            nurej_cud: result.rows[0].nurej_cud,
            delito: result.rows[0].delito,
            status: 'success',
            message: 'Traspasado exitosamente'
          });

          casosActualizados.push(result.rows[0]);
        }
      } catch (error) {
        console.error(`Error al traspasar caso ${casoId}:`, error);
        resultados.push({
          caso_id: casoId,
          status: 'error',
          message: error.message
        });
      }
    }

    res.status(200).json({
      message: `Traspaso completado. ${casosActualizados.length} de ${caso_ids.length} casos actualizados`,
      detalles: resultados,
      nuevo_responsable: {
        id: nuevoResponsable.rows[0].id,
        nombre: `${nuevoResponsable.rows[0].nombre} ${nuevoResponsable.rows[0].apellido_paterno}`
      },
      fecha_traspaso: new Date().toISOString(),
      total_casos: casosActualizados.length
    });

  } catch (error) {
    console.error("Error en TrasladarCasos:", error);
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
};

// Editar caso
const EditarCaso = async (req, res, next) => {
  try {
    const id = req.params.id;
    const {
      nurej_cud, 
      delito, 
      tipo_caso, 
      asunto,
      fecha_ingreso, 
      fecha_inicio, 
      materia,
      creado_por, 
      clientes_id, 
      estado, 
      responsable_id,
      juzgado_nombre,
      juzgado_ubicacion
    } = req.body;

    if (!delito || !tipo_caso || !asunto) {
      return res.status(400).json({ message: 'Los campos delito, tipo_caso y asunto son requeridos' });
    }

    const result = await pool.query(
      `UPDATE casos
       SET 
        nurej_cud = $1, 
        delito = $2, 
        tipo_caso = $3, 
        asunto = $4,
        fecha_ingreso = $5, 
        fecha_inicio = $6,
        materia = $7, 
        creado_por = $8,
        clientes_id = $9, 
        estado = $10,
        responsable_id = $11,
        juzgado_nombre = $12,
        juzgado_ubicacion = $13
       WHERE id = $14
       RETURNING *`,
      [
        nurej_cud || null,
        delito,
        tipo_caso,
        asunto,
        fecha_ingreso || null,
        fecha_inicio || null,
        materia || null,
        creado_por || null,
        clientes_id || null,
        estado || 'activo',
        responsable_id || null,
        juzgado_nombre || null,
        juzgado_ubicacion || null,
        id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Caso no encontrado" });
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error("❌ Error editando caso:", error);
    res.status(500).json({ message: 'Error al editar caso', error: error.message });
  }
};

// Eliminar caso
const EliminarCaso = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await pool.query("DELETE FROM casos WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Caso no encontrado" });
    res.sendStatus(204);
  } catch (error) {
    console.error("❌ Error eliminando caso:", error);
    res.status(500).json({ message: 'Error al eliminar caso', error: error.message });
  }
};

const ActualizarSeguimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const { seguimiento } = req.body;

    if (!id) {
      return res.status(400).json({ message: "El ID del caso es requerido" });
    }

    if (!seguimiento) {
      return res.status(400).json({ message: "El campo seguimiento es requerido" });
    }

    console.log(`🔁 Actualizando seguimiento del caso ID ${id} a: ${seguimiento}`);

    const result = await pool.query(
      `UPDATE casos
       SET seguimiento = $1
       WHERE id = $2
       RETURNING id, seguimiento`,
      [seguimiento, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Caso no encontrado" });
    }

    console.log(`✅ Seguimiento actualizado correctamente.`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar seguimiento:", error);
    res.status(500).json({
      message: "Error al actualizar el seguimiento del caso",
      error: error.message,
    });
  }
};

module.exports = {
  ListaCasos,
  Caso,
  CrearCaso,
  EditarCaso,
  EliminarCaso,
  ActualizarSeguimiento,
  TrasladarCasos
};