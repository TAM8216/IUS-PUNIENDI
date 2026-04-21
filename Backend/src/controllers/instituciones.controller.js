const pool = require("../db");

// 📋 LISTAR INSTITUCIONES CON DIRECCIONES
const listarInstituciones = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT i.id, i.nombre, i.imagen,
             json_agg(
               json_build_object(
                 'id', d.id, 
                 'direccion', d.direccion, 
                 'contacto', d.contacto
               )
             ) AS direcciones
      FROM instituciones i
      LEFT JOIN direcciones d ON d.institucion_id = i.id
      GROUP BY i.id
      ORDER BY i.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// 🔍 OBTENER INSTITUCIÓN POR ID
const obtenerInstitucion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT i.id, i.nombre, i.imagen,
             json_agg(
               json_build_object(
                 'id', d.id, 
                 'direccion', d.direccion, 
                 'contacto', d.contacto
               )
             ) AS direcciones
      FROM instituciones i
      LEFT JOIN direcciones d ON d.institucion_id = i.id
      WHERE i.id = $1
      GROUP BY i.id
    `, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Institución no encontrada" });

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ➕ CREAR INSTITUCIÓN CON DIRECCIONES
const crearInstitucion = async (req, res, next) => {
  try {
    const { nombre, imagen, direcciones } = req.body;

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    const result = await pool.query(
      `INSERT INTO instituciones (nombre, imagen) VALUES ($1, $2) RETURNING *`,
      [nombre, imagen || null]
    );
    const nuevaInstitucion = result.rows[0];

    // Insertar direcciones si existen
    if (Array.isArray(direcciones) && direcciones.length > 0) {
      for (const d of direcciones) {
        if (d.direccion || d.contacto) {
          await pool.query(
            `INSERT INTO direcciones (institucion_id, direccion, contacto) VALUES ($1, $2, $3)`,
            [nuevaInstitucion.id, d.direccion || '', d.contacto || '']
          );
        }
      }
    }

    // Obtener la institución creada con sus direcciones
    const institucionCompleta = await pool.query(`
      SELECT i.id, i.nombre, i.imagen,
             json_agg(
               json_build_object(
                 'id', d.id, 
                 'direccion', d.direccion, 
                 'contacto', d.contacto
               )
             ) AS direcciones
      FROM instituciones i
      LEFT JOIN direcciones d ON d.institucion_id = i.id
      WHERE i.id = $1
      GROUP BY i.id
    `, [nuevaInstitucion.id]);

    res.status(201).json(institucionCompleta.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ✏️ EDITAR INSTITUCIÓN
const editarInstitucion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, imagen, direcciones } = req.body;

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    const result = await pool.query(
      `UPDATE instituciones SET nombre=$1, imagen=$2 WHERE id=$3 RETURNING *`,
      [nombre, imagen || null, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Institución no encontrada" });

    // Actualizar direcciones: eliminar y reinsertar
    await pool.query(`DELETE FROM direcciones WHERE institucion_id=$1`, [id]);
    
    if (Array.isArray(direcciones) && direcciones.length > 0) {
      for (const d of direcciones) {
        if (d.direccion || d.contacto) {
          await pool.query(
            `INSERT INTO direcciones (institucion_id, direccion, contacto) VALUES ($1, $2, $3)`,
            [id, d.direccion || '', d.contacto || '']
          );
        }
      }
    }

    // Obtener la institución actualizada con sus direcciones
    const institucionActualizada = await pool.query(`
      SELECT i.id, i.nombre, i.imagen,
             json_agg(
               json_build_object(
                 'id', d.id, 
                 'direccion', d.direccion, 
                 'contacto', d.contacto
               )
             ) AS direcciones
      FROM instituciones i
      LEFT JOIN direcciones d ON d.institucion_id = i.id
      WHERE i.id = $1
      GROUP BY i.id
    `, [id]);

    res.json(institucionActualizada.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ❌ ELIMINAR INSTITUCIÓN
const eliminarInstitucion = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Primero eliminar las direcciones relacionadas
    await pool.query(`DELETE FROM direcciones WHERE institucion_id=$1`, [id]);
    
    // Luego eliminar la institución
    const result = await pool.query(`DELETE FROM instituciones WHERE id=$1 RETURNING *`, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Institución no encontrada" });

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  editarInstitucion,
  eliminarInstitucion
};