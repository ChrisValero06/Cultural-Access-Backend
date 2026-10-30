// models/TipoPromocion.js
const db = require('../db');

function normalizarLimiteUso(raw) {
    const limiteUsoRaw = (raw || '').toString().trim();
    const limite_uso = (limiteUsoRaw === 'una_vez' || limiteUsoRaw === 'mensual') ? limiteUsoRaw : null;
    const limitar_uso = limite_uso ? 1 : 0;
    return { limite_uso, limitar_uso };
}

class TipoPromocion {
    static async getAll() {
        try {
            const [tipos] = await db.execute('SELECT * FROM tipos_promocion ORDER BY nombre ASC');

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

    static async create(nombre, instituciones = [], activo = true, limiteUsoRaw = null) {
        try {
            const { limite_uso, limitar_uso } = normalizarLimiteUso(limiteUsoRaw);

            const [result] = await db.execute(
                'INSERT INTO tipos_promocion (nombre, activo, limite_uso, limitar_uso) VALUES (?, ?, ?, ?)',
                [nombre, activo ? 1 : 0, limite_uso, limitar_uso]
            );

            const tipoId = result.insertId;

            if (instituciones.length > 0) {
                for (const inst of instituciones) {
                    await db.execute(
                        'INSERT INTO tipos_promocion_instituciones (tipo_promocion_id, institucion_nombre) VALUES (?, ?)',
                        [tipoId, inst]
                    );
                }
            }

            return { id: tipoId, nombre, instituciones, limite_uso, limitar_uso };
        } catch (error) {
            console.error('Error en TipoPromocion.create:', error);
            throw error;
        }
    }

    static async update(id, nombre, instituciones = [], activo = true, limiteUsoRaw = null) {
        try {
            const [rows] = await db.execute('SELECT nombre FROM tipos_promocion WHERE id = ?', [id]);
            const nombreAnterior = rows[0]?.nombre;
            const { limite_uso, limitar_uso } = normalizarLimiteUso(limiteUsoRaw);

            const [result] = await db.execute(
                'UPDATE tipos_promocion SET nombre = ?, activo = ?, limite_uso = ?, limitar_uso = ? WHERE id = ?',
                [nombre, activo ? 1 : 0, limite_uso, limitar_uso, id]
            );

            if (nombreAnterior && nombreAnterior !== nombre) {
                await db.execute(
                    'UPDATE promociones SET tipo_promocion = ? WHERE tipo_promocion = ?',
                    [nombre, nombreAnterior]
                );
            }

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

    static async setActivo(id, activo) {
        try {
            const [result] = await db.execute(
                'UPDATE tipos_promocion SET activo = ? WHERE id = ?',
                [activo ? 1 : 0, id]
            );
            return { affectedRows: result.affectedRows };
        } catch (error) {
            console.error('Error en TipoPromocion.setActivo:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
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
