// models/TipoPromocion.js
const db = require('../db');

class TipoPromocion {
    static async getAll() {
        try {
            const [tipos] = await db.execute('SELECT * FROM tipos_promocion ORDER BY nombre ASC');

            // Obtener instituciones de cada tipo
            for (const tipo of tipos) {
                const [instituciones] = await db.execute(
                    'SELECT institucion_nombre FROM tipos_promocion_instituciones WHERE tipo_promocion_id = ? ORDER BY institucion_nombre ASC',
                    [tipo.id]
                );
                tipo.instituciones = instituciones.map(i => i.institucion_nombre);
            }

            return tipos;
        } catch (error) {
            console.error('Error en TipoPromocion.getAll:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.execute('SELECT * FROM tipos_promocion WHERE id = ?', [id]);
            const tipo = rows[0] || null;

            if (tipo) {
                const [instituciones] = await db.execute(
                    'SELECT institucion_nombre FROM tipos_promocion_instituciones WHERE tipo_promocion_id = ? ORDER BY institucion_nombre ASC',
                    [id]
                );
                tipo.instituciones = instituciones.map(i => i.institucion_nombre);
            }

            return tipo;
        } catch (error) {
            console.error('Error en TipoPromocion.getById:', error);
            throw error;
        }
    }

    static async create(nombre, instituciones = []) {
        try {
            const [result] = await db.execute(
                'INSERT INTO tipos_promocion (nombre) VALUES (?)',
                [nombre]
            );

            const tipoId = result.insertId;

            // Insertar instituciones asignadas
            if (instituciones.length > 0) {
                const values = instituciones.map(inst => [tipoId, inst]);
                for (const [tId, inst] of values) {
                    await db.execute(
                        'INSERT INTO tipos_promocion_instituciones (tipo_promocion_id, institucion_nombre) VALUES (?, ?)',
                        [tId, inst]
                    );
                }
            }

            return { id: tipoId, nombre, instituciones };
        } catch (error) {
            console.error('Error en TipoPromocion.create:', error);
            throw error;
        }
    }

	static async update(id, nombre, instituciones = []) {
      try {
          // Obtener el nombre anterior para actualizar las promociones existentes
          const [rows] = await db.execute('SELECT nombre FROM tipos_promocion WHERE id = ?', [id]);
          const nombreAnterior = rows[0]?.nombre;

          const [result] = await db.execute(
              'UPDATE tipos_promocion SET nombre = ? WHERE id = ?',
              [nombre, id]
          );

          // Actualizar el nombre en todas las promociones que usen el nombre anterior
          if (nombreAnterior && nombreAnterior !== nombre) {
              await db.execute(
                  'UPDATE promociones SET tipo_promocion = ? WHERE tipo_promocion = ?',
                  [nombre, nombreAnterior]
              );
          }

          // Reemplazar instituciones
          await db.execute(
              'DELETE FROM tipos_promocion_instituciones WHERE tipo_promocion_id = ?',
              [id]
          );

          if (instituciones.length > 0) {
              for (const inst of instituciones) {
                  await db.execute(
                      'INSERT INTO tipos_promocion_instituciones (tipo_promocion_id, institucion_nombre) VALUES (?, ?)',      
                      [id, inst]
                  );
              }
          }

          return { affectedRows: result.affectedRows };
      } catch (error) {
          console.error('Error en TipoPromocion.update:', error);
          throw error;
      }
  }

    static async delete(id) {
        try {
            // Eliminar instituciones asignadas primero
            await db.execute(
                'DELETE FROM tipos_promocion_instituciones WHERE tipo_promocion_id = ?',
                [id]
            );

            const [result] = await db.execute(
                'DELETE FROM tipos_promocion WHERE id = ?',
                [id]
            );
            return { affectedRows: result.affectedRows };
        } catch (error) {
            console.error('Error en TipoPromocion.delete:', error);
            throw error;
        }
    }
}

module.exports = TipoPromocion;
