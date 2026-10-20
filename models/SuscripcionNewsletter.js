// models/SuscripcionNewsletter.js
const db = require('../db');

class SuscripcionNewsletter {
    static async getAll() {
        const [rows] = await db.execute('SELECT * FROM suscripciones_newsletter ORDER BY created_at DESC');
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.execute('SELECT * FROM suscripciones_newsletter WHERE id = ?', [id]);
        return rows[0] || null;
    }

    // Devuelve { suscripcion, creada } — creada=false si el correo ya existía
    static async findOrCreate(correo) {
        const [existentes] = await db.execute(
            'SELECT * FROM suscripciones_newsletter WHERE correo_electronico = ?',
            [correo]
        );
        if (existentes.length > 0) return { suscripcion: existentes[0], creada: false };

        const [result] = await db.execute(
            'INSERT INTO suscripciones_newsletter (correo_electronico) VALUES (?)',
            [correo]
        );
        return { suscripcion: { id: result.insertId, correo_electronico: correo }, creada: true };
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM suscripciones_newsletter WHERE id = ?', [id]);
        return { affectedRows: result.affectedRows };
    }
}

module.exports = SuscripcionNewsletter;
