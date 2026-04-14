import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

console.log("✅ JWT_SECRET configurado:", process.env.JWT_SECRET ? "Sí" : "No");

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());

import casosRoutes from "./routes/casos.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import documentosRoutes from "./routes/documentos.routes.js";
import institucionesRoutes from "./routes/instituciones.routes.js";
import auditoriasRoutes from "./routes/auditoria.routes.js";
import jurisprudenciaRoutes from "./routes/jurisprudencia.routes.js"; // ← NUEVA IMPORTACIÓN
import tareasRoutes from "./routes/tareas.routes.js";
import accionesRoutes from "./routes/acciones.routes.js";
import notificacionesRoutes from './routes/notificaciones.routes.js';
import authRoutes from "./routes/auth.routes.js";

// Carpeta pública para documentos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 📄 RUTA PÚBLICA PARA REPORTE POR NUREJ
app.get("/api/reporte/caso/nurej/:nurej", async (req, res) => {
  try {
    const { nurej } = req.params;
    console.log(`📄 Solicitando reporte público del caso NUREJ: "${nurej}"`);

    const pool = require("./db");
    
    // Primero hagamos una consulta de diagnóstico
    const diagnosticQuery = `
      SELECT 
        id,
        nurej_cud,
        LENGTH(nurej_cud) as length,
        delito,
        estado
      FROM casos 
      WHERE nurej_cud IS NOT NULL
      ORDER BY id DESC
      LIMIT 10
    `;

    console.log("🔍 Ejecutando consulta de diagnóstico...");
    const diagnosticResult = await pool.query(diagnosticQuery);
    
    console.log("📊 Casos encontrados en BD:");
    diagnosticResult.rows.forEach(row => {
      console.log(`   ID: ${row.id}, NUREJ: "${row.nurej_cud}" (longitud: ${row.length}), Delito: ${row.delito}`);
    });

    // Ahora la consulta principal con diferentes enfoques
    const query = `
      SELECT 
        c.id,
        c.nurej_cud,
        c.delito,
        c.tipo_caso,
        c.asunto,
        c.estado,
        c.fecha_ingreso,
        c.fecha_inicio,
        c.materia,
        c.seguimiento,
        CONCAT(cl.nombre, ' ', cl.apellido_paterno, ' ', cl.apellido_materno) AS cliente
      FROM casos c
      LEFT JOIN clientes cl ON c.clientes_id = cl.id
      WHERE c.nurej_cud = $1 
         OR c.nurej_cud = TRIM($1)
         OR c.nurej_cud ILIKE $1
    `;

    console.log(`🔍 Ejecutando consulta principal para: "${nurej}"`);
    const result = await pool.query(query, [nurej]);

    console.log(`📊 Resultados encontrados: ${result.rows.length}`);

    if (result.rows.length === 0) {
      // Intentemos con búsqueda más flexible
      console.log("🔍 Intentando búsqueda flexible...");
      const flexibleQuery = `
        SELECT id, nurej_cud, delito, estado
        FROM casos 
        WHERE nurej_cud LIKE $1
           OR nurej_cud LIKE '%' || $1 || '%'
      `;
      
      const flexibleResult = await pool.query(flexibleQuery, [nurej]);
      console.log(`📊 Resultados búsqueda flexible: ${flexibleResult.rows.length}`);
      
      if (flexibleResult.rows.length > 0) {
        console.log("📊 Coincidencias encontradas:");
        flexibleResult.rows.forEach(row => {
          console.log(`   ID: ${row.id}, NUREJ: "${row.nurej_cud}", Delito: ${row.delito}`);
        });
      }

      return res.status(404).json({ 
        success: false,
        message: `Caso no encontrado con el NUREJ: "${nurej}"`,
        diagnostic: {
          total_cases_in_db: diagnosticResult.rows.length,
          similar_nurejs: flexibleResult.rows.map(r => ({ 
            id: r.id, 
            nurej: r.nurej_cud,
            delito: r.delito 
          }))
        }
      });
    }

    const caso = result.rows[0];
    console.log(`✅ Caso encontrado: ID ${caso.id}, NUREJ: "${caso.nurej_cud}"`);

    const reporte = {
      success: true,
      data: {
        id: caso.id,
        nurej_cud: caso.nurej_cud,
        delito: caso.delito,
        tipo_caso: caso.tipo_caso,
        asunto: caso.asunto,
        estado: caso.estado,
        fecha_ingreso: caso.fecha_ingreso,
        fecha_inicio: caso.fecha_inicio,
        materia: caso.materia,
        seguimiento: caso.seguimiento,
        cliente: caso.cliente || "No asignado",
        fecha_reporte: new Date().toISOString()
      },
      metadata: {
        version: "1.0",
        generado_en: new Date().toISOString(),
        tipo: "reporte_basico"
      }
    };

    console.log(`✅ Reporte generado exitosamente para NUREJ: ${nurej}`);
    
    res.json(reporte);

  } catch (error) {
    console.error("❌ Error generando reporte público por NUREJ:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al generar el reporte",
      error: error.message 
    });
  }
});

// 🔍 RUTA PÚBLICA PARA BUSCAR CASOS POR CLIENTE (NOMBRE Y/O CI)
app.get("/api/casos/buscar-por-cliente", async (req, res) => {
  try {
    const { nombre, ci } = req.query;
    
    console.log(`🔍 Búsqueda pública recibida - Nombre: "${nombre}", CI: "${ci}"`);

    if (!nombre && !ci) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos el nombre o CI del cliente"
      });
    }

    const pool = require("./db");

    let query = `
      SELECT 
        c.id,
        c.nurej_cud as codigo_caso,
        c.delito,
        c.tipo_caso,
        c.asunto,
        c.estado,
        c.fecha_ingreso,
        c.fecha_inicio,
        c.materia,
        CONCAT(cl.nombre, ' ', cl.apellido_paterno, ' ', COALESCE(cl.apellido_materno, '')) AS cliente_nombre,
        cl.ci as cliente_ci
      FROM casos c
      INNER JOIN clientes cl ON c.clientes_id = cl.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    // Agregar condiciones según los parámetros proporcionados
    if (nombre) {
      paramCount++;
      query += ` AND (cl.nombre ILIKE $${paramCount} OR cl.apellido_paterno ILIKE $${paramCount} OR cl.apellido_materno ILIKE $${paramCount})`;
      queryParams.push(`%${nombre}%`);
    }

    if (ci) {
      paramCount++;
      query += ` AND cl.ci ILIKE $${paramCount}`;
      queryParams.push(`%${ci}%`);
    }

    query += ` ORDER BY c.fecha_ingreso DESC, c.id DESC`;

    console.log(`📊 Ejecutando consulta:`, query);
    console.log(`📊 Con parámetros:`, queryParams);

    const result = await pool.query(query, queryParams);

    console.log(`✅ Resultados de BD:`, result.rows);

    // Formatear la respuesta para vista pública
    const casos = result.rows.map(caso => ({
      id: caso.id,
      codigo_caso: caso.codigo_caso || `C-${caso.id}`,
      cliente_nombre: caso.cliente_nombre?.trim() || "Cliente no asignado",
      cliente_ci: caso.cliente_ci || "Sin CI",
      delito: caso.delito || "No especificado",
      tipo_caso: caso.tipo_caso || "No especificado",
      asunto: caso.asunto || "Sin asunto",
      estado: caso.estado || "Pendiente",
      fecha_ingreso: caso.fecha_ingreso,
      fecha_inicio: caso.fecha_inicio,
      materia: caso.materia
    }));

    console.log(`📊 Casos formateados:`, casos);

    res.json({
      success: true,
      data: casos,
      metadata: {
        total: casos.length,
        parametros_busqueda: {
          nombre: nombre || "No proporcionado",
          ci: ci || "No proporcionado"
        },
        fecha_consulta: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error en búsqueda pública por cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al buscar casos",
      error: error.message
    });
  }
});

// Ruta adicional para búsqueda flexible pública de casos
app.get("/api/casos/buscar-publico", async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar un término de búsqueda"
      });
    }

    const pool = require("./db");

    const sqlQuery = `
      SELECT 
        c.id,
        c.nurej_cud as codigo_caso,
        c.delito,
        c.estado,
        c.fecha_ingreso,
        CONCAT(cl.nombre, ' ', cl.apellido_paterno, ' ', COALESCE(cl.apellido_materno, '')) AS cliente_nombre,
        cl.ci as cliente_ci
      FROM casos c
      INNER JOIN clientes cl ON c.clientes_id = cl.id
      WHERE c.nurej_cud ILIKE $1 
         OR cl.nombre ILIKE $1 
         OR cl.apellido_paterno ILIKE $1
         OR cl.apellido_materno ILIKE $1
         OR cl.ci ILIKE $1
         OR c.delito ILIKE $1
      ORDER BY c.fecha_ingreso DESC
      LIMIT 50
    `;

    const result = await pool.query(sqlQuery, [`%${searchQuery}%`]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error("❌ Error en búsqueda pública de casos:", error);
    res.status(500).json({
      success: false,
      message: "Error en la búsqueda",
      error: error.message
    });
  }
});

// Rutas de la API
app.use("/api/clientes", clientesRoutes);
app.use("/api/casos", casosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/documentos", documentosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/instituciones", institucionesRoutes);
app.use("/api/auditorias", auditoriasRoutes);
app.use("/api/jurisprudencia", jurisprudenciaRoutes); // ← NUEVA RUTA (singular)
app.use("/api/tareas", tareasRoutes);
app.use("/api/acciones", accionesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Manejo de errores
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ 
    success: false,
    message: error.message 
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`));