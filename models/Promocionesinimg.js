const db = require('../db');

class Promocion {
  static async getAllActive() {
    try {
      const query = `
        SELECT * FROM promociones 
        WHERE estado = 'activa' 
          AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
        ORDER BY fecha_creacion DESC
      `;
      const [rows] = await db.execute(query);
      return { success: true, data: rows, count: rows.length };
    } catch (error) {
      console.error('Error en getAllActive:', error);
      throw error;
    }
  }

  // Sin dependencias de imágenes
  static async getForCarousel() {
    try {
      const query = `
        SELECT id, institucion, tipo_promocion, estado
        FROM promociones 
        WHERE estado = 'activa'
          AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
        ORDER BY fecha_creacion DESC 
        LIMIT 5
      `;
      const [rows] = await db.execute(query);
      return { success: true, data: rows, count: rows.length };
    } catch (error) {
      console.error('Error en getForCarousel:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const query = 'SELECT * FROM promociones WHERE id = ?';
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return { success: false, error: 'Promoción no encontrada' };
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  }

  // Crear promoción SIN columnas de imagen
  static async create(promocionData) {
    try {
      const mapped = {
        institucion: promocionData.institucion ?? null,
        tipo_promocion: promocionData.tipo_promocion ?? null,
        disciplina: promocionData.disciplina ?? null,
        beneficios: promocionData.beneficios ?? null,
        comentarios_restricciones: promocionData.comentarios_restricciones ?? null,
        fecha_inicio: promocionData.fecha_inicio ?? null,
        fecha_fin: promocionData.fecha_fin ?? null,
        estado: promocionData.estado ?? 'activa'
      };

      const entries = Object.entries(mapped);
      const fields = entries.map(([k]) => k);
      const values = entries.map(([, v]) => v);
      const placeholders = fields.map(() => '?').join(', ');

      const query = `INSERT INTO promociones (${fields.join(', ')}) VALUES (${placeholders})`;
      const [result] = await db.execute(query, values);
      return { success: true, id: result.insertId, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error en create:', error);
      throw error;
    }
  }

  static async update(id, promocionData) {
    try {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(promocionData)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      if (fields.length === 0) return { success: false, error: 'No hay campos para actualizar' };
      values.push(id);
      const query = `UPDATE promociones SET ${fields.join(', ')} WHERE id = ?`;
      const [result] = await db.execute(query, values);
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error en update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = 'UPDATE promociones SET estado = "eliminada" WHERE id = ?';
      const [result] = await db.execute(query, [id]);
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Error en delete:', error);
      throw error;
    }
  }
}

module.exports = Promocion;