// config/db.js
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER ||'cultural_Acces',
  password: process.env.DB_PASS || '7U#Bu$uI5ark5dgu',
  database: process.env.DB_NAME || 'cultural_Acces',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'America/Mexico_City',
  charset: 'utf8mb4'
});

// Probar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a la base de datos MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la BD:', error.message);
    return false;
  }
}

// Ejecutar prueba de conexión al iniciar
testConnection();

// Exportar el pool para usar en los modelos
module.exports = {
    pool,
    getConnection: () => pool.getConnection(),
    execute: (query, params) => {
      return pool.execute(query, params);
    },
    query: (query, params) => {
      return pool.query(query, params);
    }
  };