/**
 * Modelo para la tabla config (textos promociones).
 * En tu backend, este archivo debe estar en: models/Config.js
 * Necesitas crear la tabla config y pasar el pool de MySQL a createConfigModel(pool).
 */

const CLAVE_TEXTOS_PROMOCIONES = 'textos_promociones';
const DEFAULTS = {
  titulo: 'PROMOCIONES VIGENTES - FEBRERO',
  subtitulo: 'Presentando tarjeta y sujetas a disponibilidad'
};

function createConfigModel(pool) {
  return {
    async getTextosPromociones() {
      const [rows] = await pool.query(
        'SELECT valor FROM config WHERE clave = ? LIMIT 1',
        [CLAVE_TEXTOS_PROMOCIONES]
      );
      if (!rows || rows.length === 0) return DEFAULTS;
      const valor = rows[0].valor;
      if (typeof valor === 'string') {
        try {
          const parsed = JSON.parse(valor);
          return {
            titulo: typeof parsed.titulo === 'string' ? parsed.titulo : DEFAULTS.titulo,
            subtitulo: typeof parsed.subtitulo === 'string' ? parsed.subtitulo : DEFAULTS.subtitulo
          };
        } catch (e) {
          return DEFAULTS;
        }
      }
      if (valor && typeof valor === 'object') {
        return {
          titulo: typeof valor.titulo === 'string' ? valor.titulo : DEFAULTS.titulo,
          subtitulo: typeof valor.subtitulo === 'string' ? valor.subtitulo : DEFAULTS.subtitulo
        };
      }
      return DEFAULTS;
    },

    async updateTextosPromociones(data) {
      const titulo = typeof data.titulo === 'string' ? data.titulo : DEFAULTS.titulo;
      const subtitulo = typeof data.subtitulo === 'string' ? data.subtitulo : DEFAULTS.subtitulo;
      const valor = JSON.stringify({ titulo, subtitulo });

      await pool.query(
        `INSERT INTO config (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = CURRENT_TIMESTAMP`,
        [CLAVE_TEXTOS_PROMOCIONES, valor]
      );
      return { titulo, subtitulo };
    }
  };
}

module.exports = { createConfigModel, CLAVE_TEXTOS_PROMOCIONES, DEFAULTS };
