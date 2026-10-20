// models/CampanaNewsletter.js
const db = require('../db');

const CAMPOS_EDITABLES = ['nombre', 'asunto', 'from_name', 'titulo', 'intro_texto', 'footer_texto', 'color_primario', 'bloques'];

// mysql2 puede devolver la columna JSON como string o como objeto según la versión del servidor
function normalizar(row) {
    if (!row) return null;
    let bloques = row.bloques;
    if (typeof bloques === 'string') {
        try { bloques = JSON.parse(bloques); } catch { bloques = []; }
    }
    return { ...row, bloques: Array.isArray(bloques) ? bloques : [] };
}

class CampanaNewsletter {
    static async getAll() {
        const [rows] = await db.execute('SELECT * FROM campanas_newsletter ORDER BY created_at DESC');
        return rows.map(normalizar);
    }

    static async getById(id) {
        const [rows] = await db.execute('SELECT * FROM campanas_newsletter WHERE id = ?', [id]);
        return normalizar(rows[0]);
    }

    static async create(data) {
        const [result] = await db.execute(
            `INSERT INTO campanas_newsletter
                (nombre, asunto, from_name, titulo, intro_texto, footer_texto, color_primario, bloques, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'borrador')`,
            [
                data.nombre,
                data.asunto,
                data.from_name || 'CulturAll Access',
                data.titulo || null,
                data.intro_texto || null,
                data.footer_texto || null,
                data.color_primario || '#F97316',
                JSON.stringify(Array.isArray(data.bloques) ? data.bloques : []),
            ]
        );
        return this.getById(result.insertId);
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        for (const campo of CAMPOS_EDITABLES) {
            if (data[campo] === undefined) continue;
            fields.push(`${campo} = ?`);
            values.push(campo === 'bloques' ? JSON.stringify(data[campo] || []) : data[campo]);
        }
        if (fields.length === 0) return this.getById(id);
        values.push(id);
        await db.execute(`UPDATE campanas_newsletter SET ${fields.join(', ')} WHERE id = ?`, values);
        return this.getById(id);
    }

    static async setMailchimpId(id, mailchimpId) {
        await db.execute('UPDATE campanas_newsletter SET mailchimp_id = ? WHERE id = ?', [mailchimpId, id]);
    }

    static async marcarEnviada(id, mailchimpId) {
        await db.execute(
            "UPDATE campanas_newsletter SET mailchimp_id = ?, estado = 'enviada', enviada_en = NOW() WHERE id = ?",
            [mailchimpId, id]
        );
    }

    static async marcarProgramada(id, mailchimpId, fecha) {
        await db.execute(
            "UPDATE campanas_newsletter SET mailchimp_id = ?, estado = 'programada', programada_para = ? WHERE id = ?",
            [mailchimpId, fecha, id]
        );
    }

    static async marcarBorrador(id) {
        await db.execute(
            "UPDATE campanas_newsletter SET estado = 'borrador', programada_para = NULL WHERE id = ?",
            [id]
        );
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM campanas_newsletter WHERE id = ?', [id]);
        return { affectedRows: result.affectedRows };
    }
}

module.exports = CampanaNewsletter;
