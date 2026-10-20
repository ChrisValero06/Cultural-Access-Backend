-- Tablas del newsletter (campañas Mailchimp + suscriptores del sitio público).
-- Ejecutar una sola vez en la base cultural_Acces (phpMyAdmin > SQL).

CREATE TABLE IF NOT EXISTS campanas_newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  asunto VARCHAR(255) NOT NULL,
  from_name VARCHAR(100) DEFAULT 'CulturAll Access',
  titulo TEXT NULL,
  intro_texto TEXT NULL,
  footer_texto TEXT NULL,
  color_primario VARCHAR(7) DEFAULT '#F97316',
  bloques JSON NULL,
  mailchimp_id VARCHAR(100) NULL,
  estado ENUM('borrador', 'enviada', 'programada') NOT NULL DEFAULT 'borrador',
  programada_para DATETIME NULL,
  enviada_en DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suscripciones_newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  correo_electronico VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
