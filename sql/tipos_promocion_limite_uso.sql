-- Límite de uso a nivel de catálogo tipos_promocion
-- Valores de limite_uso: 'una_vez' | 'mensual' | NULL (ilimitado)
-- limitar_uso: 1 si hay límite, 0 si no
--
-- Aplicar en prod (MySQL):
--   mysql -u USER -p DB_NAME < sql/tipos_promocion_limite_uso.sql
-- o: node sql/apply_tipos_promocion_limite_uso.js
--
-- Si la columna ya existe, ignorar el error ER_DUP_FIELDNAME.

ALTER TABLE tipos_promocion
  ADD COLUMN limite_uso VARCHAR(20) NULL DEFAULT NULL
    COMMENT 'una_vez | mensual | NULL=ilimitado'
  AFTER activo;

ALTER TABLE tipos_promocion
  ADD COLUMN limitar_uso TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1=hay límite, 0=ilimitado'
  AFTER limite_uso;
