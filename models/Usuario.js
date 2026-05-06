  const db = require('../db');                                                                                                            
  
  class Usuario {

    // Crear nuevo usuario
    static async create(usuarioData) {
      const {
        nombre,
        apellido_paterno,
        apellido_materno,
        genero,
        email,
        telefono,
        calle_numero,
        municipio,
        estado,
        colonia,
        codigo_postal,
        edad,
        estudios,
        curp,
        estado_nacimiento,
        fecha_nacimiento,
        numero_tarjeta,
        acepta_info,
        estado_civil,
        registrado_por
      } = usuarioData;

      const query = `
        INSERT INTO registro_usuarios
        (nombre, apellido_paterno, apellido_materno, genero, email, telefono,
         calle_numero, municipio, estado, colonia, codigo_postal, edad, estudios,
         curp, estado_nacimiento, fecha_nacimiento, numero_tarjeta, acepta_info, estado_civil, registrado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Validar campos obligatorios según la estructura real de la tabla
      if (!calle_numero || !municipio || !estado || !colonia || !codigo_postal ||
          !estado_nacimiento || !fecha_nacimiento) {
        throw new Error('Los campos calle_numero, municipio, estado, colonia, codigo_postal, estado_nacimiento y fecha_nacimiento son    obligatorios');
      }

      const values = [
        nombre,
        apellido_paterno,
        apellido_materno || null,
        genero || null,
        email,
        telefono || null,
        calle_numero,
        municipio,
        estado,
        colonia,
        codigo_postal,
        edad || null,
        estudios || null,
        curp || null,
        estado_nacimiento,
        fecha_nacimiento,
        numero_tarjeta || null,
        acepta_info || 0,
        estado_civil || null,
        registrado_por || null
      ];

      try {
        const [result] = await db.execute(query, values);
        return { success: true, id: result.insertId };
      } catch (error) {
        console.error('Error en modelo Usuario.create:', error);
        throw error;
      }
    }

    // Obtener usuario por email
    static async getByEmail(email) {
      const query = 'SELECT * FROM registro_usuarios WHERE email = ?';

      try {
        const [rows] = await db.execute(query, [email]);
        return { success: true, data: rows[0] };
      } catch (error) {
        console.error('Error en modelo Usuario.getByEmail:', error);
        throw error;
      }
    }

    // Obtener usuario por número de tarjeta
    static async getByNumeroTarjeta(numeroTarjeta) {
      const query = 'SELECT * FROM registro_usuarios WHERE numero_tarjeta = ?';

      try {
        const [rows] = await db.execute(query, [numeroTarjeta]);
        return { success: true, data: rows[0] || null };
      } catch (error) {
        console.error('Error en modelo Usuario.getByNumeroTarjeta:', error);
        return { success: false, data: null, error: error.message };
      }
    }

    // Obtener todos los usuarios (usa query en vez de execute para evitar cache de prepared statements)
    static async getAll() {
      const query = 'SELECT * FROM registro_usuarios ORDER BY fecha_registro DESC';

      try {
        const [rows] = await db.query(query);
        console.log('Total usuarios obtenidos:', rows.length);
        return { success: true, data: rows, total: rows.length };
      } catch (error) {
        console.error('Error en modelo Usuario.getAll:', error);
        throw error;
      }
    }

    // Actualizar usuario
    static async update(id, usuarioData) {
      const fields = [];
      const values = [];
      Object.keys(usuarioData).forEach(key => {
        if (usuarioData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(usuarioData[key]);
        }
      });
      values.push(id);

      const query = `UPDATE registro_usuarios SET ${fields.join(', ')} WHERE id = ?`;
      try {
        const [result] = await db.execute(query, values);
        return { success: true, affectedRows: result.affectedRows };
      } catch (error) {
        console.error('Error en modelo Usuario.update:', error);
        throw error;
      }
    }

    // Eliminar usuario
    static async delete(id) {
      const query = 'DELETE FROM registro_usuarios WHERE id = ?';

      try {
        const [result] = await db.execute(query, [id]);
        return { success: true, affectedRows: result.affectedRows };
      } catch (error) {
        console.error('Error en modelo Usuario.delete:', error);
        throw error;
      }
    }
  }

  module.exports = Usuario;