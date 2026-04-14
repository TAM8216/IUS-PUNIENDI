-- Migración: Agregar campos de juzgado a la tabla casos
-- Ejecutar este script en la base de datos PostgreSQL

ALTER TABLE casos
ADD COLUMN IF NOT EXISTS juzgado_nombre TEXT,
ADD COLUMN IF NOT EXISTS juzgado_ubicacion TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN casos.juzgado_nombre IS 'Nombre del juzgado asignado al caso (obtenido del Órgano Judicial)';
COMMENT ON COLUMN casos.juzgado_ubicacion IS 'Ubicación completa del juzgado (edificio, calle, piso)';
