// Configuración de la base de datos
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'cultural_Acces',
    password: process.env.DB_PASS || '7U#Bu$uI5ark5dgu',
    database: process.env.DB_NAME || 'cultural_Acces',
    port: process.env.DB_PORT || 3306
  },
  server: {
    port: process.env.PORT || 3002
  }
};

module.exports = config;
