const db = require('../db');

class ControlAcceso {

    static async create(accesoData) {
        try {
			
			 const { institucion, numero_tarjeta, fecha, tipo_promocion } = accesoData;

			  const query = `
				  INSERT INTO control_acceso
				  (institucion, numero_tarjeta, fecha, tipo_promocion)
				  VALUES (?, ?, ?, ?)
			  `;

			  const values = [
				  institucion,
				  numero_tarjeta,
				  fecha || new Date().toISOString().split('T')[0],
				  tipo_promocion || null
			  ];

            const [result] = await db.execute(query, values);

            return { 
                success: true, 
                id: result.insertId,
                id_institucion: result.insertId, // También devolver como id_institucion para consistencia
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.create:', error);
            throw error;
        }
    }

    static async getAll(limit = 100, offset = 0) {
        const query = `
            SELECT * FROM control_acceso 
            ORDER BY fecha DESC, id_institucion DESC 
            LIMIT ? OFFSET ?
        `;
        try {
            const [rows] = await db.execute(query, [limit, offset]);
            return { success: true, data: rows, count: rows.length };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.getAll:', error);
            throw error;
        }
    }

    static async getByInstitucion(institucion, limit = 50) {
        const query = `
            SELECT * FROM control_acceso 
            WHERE institucion = ? 
            ORDER BY fecha DESC 
            LIMIT ?
        `;
        try {
            const [rows] = await db.execute(query, [institucion, limit]);
            return { success: true, data: rows, count: rows.length };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.getByInstitucion:', error);
            throw error;
        }
    }

    static async getByNumeroTarjeta(numero_tarjeta, limit = 50) {
        const query = `
            SELECT * FROM control_acceso 
            WHERE numero_tarjeta = ? 
            ORDER BY fecha DESC 
            LIMIT ?
        `;
        try {
            const [rows] = await db.execute(query, [numero_tarjeta, limit]);
            return { success: true, data: rows, count: rows.length };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.getByNumeroTarjeta:', error);
            throw error;
        }
    }

    static async getByFecha(fecha, limit = 50) {
        const query = `
            SELECT * FROM control_acceso 
            WHERE fecha = ? 
            ORDER BY id_institucion DESC 
            LIMIT ?
        `;
        try {
            const [rows] = await db.execute(query, [fecha, limit]);
            return { success: true, data: rows, count: rows.length };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.getByFecha:', error);
            throw error;
        }
    }

    static async getByEstado(estado, limit = 50) {
        const query = `
            SELECT * FROM control_acceso 
            WHERE estado = ? 
            ORDER BY fecha DESC 
            LIMIT ?
        `;
        try {
            const [rows] = await db.execute(query, [estado, limit]);
            return { success: true, data: rows, count: rows.length };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.getByEstado:', error);
            throw error;
        }
    }

    static async getEstadisticas(dias = 30) {
        const query = `
            SELECT 
                institucion,
                estado,
                COUNT(*) as total_accesos,
                DATE(fecha) as fecha,
                COUNT(DISTINCT numero_tarjeta) as tarjetas_unicas
            FROM control_acceso 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY institucion, DATE(fecha)
            ORDER BY fecha DESC, institucion
        `;
        try {
            const [rows] = await db.execute(query, [dias]);
            return { success: true, data: rows, count: rows.length };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.getEstadisticas:', error);
            throw error;
        }
    }

    static async updateEstado(id_institucion, nuevoEstado) {
        const query = 'UPDATE control_acceso SET estado = ? WHERE id_institucion = ?';
        try {
            const [result] = await db.execute(query, [nuevoEstado, id_institucion]);
            return { success: true, affectedRows: result.affectedRows };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.updateEstado:', error);
            throw error;
        }
    }

    static async delete(id_institucion) {
        const query = 'DELETE FROM control_acceso WHERE id_institucion = ?';
        try {
            const [result] = await db.execute(query, [id_institucion]);
            return { success: true, affectedRows: result.affectedRows };
        } catch (error) {
            console.error('Error en modelo ControlAcceso.delete:', error);
            throw error;
        }
    }
}

module.exports = ControlAcceso;

