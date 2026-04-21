// src/controllers/clientesController.js
const pool = require("../db");

// 📋 LISTAR CLIENTES
const ListaClientes = async (req, res, next) => {
  try {
    console.log("🔍 Solicitando lista de clientes...");
    
    // Query simplificada sin req.filter para evitar errores
    const queryText = `
      SELECT id, nombre, apellido_paterno, apellido_materno, ci, contacto, tipo_cliente
      FROM clientes
      ORDER BY id DESC
    `;
    
    console.log("📊 Ejecutando query:", queryText);
    const result = await pool.query(queryText);
    
    console.log(`✅ Clientes encontrados: ${result.rows.length}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en ListaClientes:", error);
    res.status(500).json({ 
      message: 'Error al obtener clientes',
      error: error.message 
    });
  }
};

// 🔍 OBTENER CLIENTE POR ID
const Cliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo cliente ID: ${id}`);
    
    const result = await pool.query("SELECT * FROM clientes WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    console.log(`✅ Cliente ${id} encontrado`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ Error obteniendo cliente ${id}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener cliente',
      error: error.message 
    });
  }
};

// ➕ CREAR CLIENTE
const CrearCliente = async (req, res, next) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, ci, contacto, tipo_cliente } = req.body;

    console.log("📝 Creando nuevo cliente:", { nombre, apellido_paterno, ci });

    // Validar campos requeridos
    if (!nombre || !apellido_paterno || !ci || !contacto) {
      return res.status(400).json({ 
        message: 'Los campos nombre, apellido paterno, CI y contacto son requeridos' 
      });
    }

    const result = await pool.query(
      `INSERT INTO clientes (nombre, apellido_paterno, apellido_materno, ci, contacto, tipo_cliente)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, ci, contacto, tipo_cliente || 'natural']
    );

    const nuevoCliente = result.rows[0];
    console.log(`✅ Cliente creado con ID: ${nuevoCliente.id}`);

    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error("❌ Error en CrearCliente:", error);
    res.status(500).json({ 
      message: 'Error al crear cliente',
      error: error.message 
    });
  }
};

// ✏️ EDITAR CLIENTE
const EditarCliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido_paterno, apellido_materno, ci, contacto, tipo_cliente } = req.body;

    console.log(`✏️ Editando cliente ID: ${id}`);

    const result = await pool.query(
      `UPDATE clientes
       SET nombre = $1, apellido_paterno = $2, apellido_materno = $3, ci = $4, contacto = $5, tipo_cliente = $6
       WHERE id = $7
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, ci, contacto, tipo_cliente, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const editCliente = result.rows[0];
    console.log(`✅ Cliente ${id} actualizado`);

    res.json(editCliente);
  } catch (error) {
    console.error(`❌ Error editando cliente ${id}:`, error);
    res.status(500).json({ 
      message: 'Error al editar cliente',
      error: error.message 
    });
  }
};

// ❌ ELIMINAR CLIENTE
const EliminarCliente = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Eliminando cliente ID: ${id}`);

    const result = await pool.query("DELETE FROM clientes WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const clienteEliminado = result.rows[0];
    console.log(`✅ Cliente ${id} eliminado`);

    res.sendStatus(204);
  } catch (error) {
    console.error(`❌ Error eliminando cliente ${id}:`, error);
    res.status(500).json({ 
      message: 'Error al eliminar cliente',
      error: error.message 
    });
  }
};

module.exports = {
  ListaClientes,
  Cliente,
  CrearCliente,
  EliminarCliente,
  EditarCliente,
};