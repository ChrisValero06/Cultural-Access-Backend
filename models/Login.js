const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT Secret (debería estar en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui';

class User {
  constructor() {
    this.pool = pool;
  }

  // Crear tabla de usuarios si no existe
  async createTable() {
    try {
      const connection = await this.pool.getConnection();
      
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role ENUM('admin', 'user') DEFAULT 'user',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      await connection.execute(createTableQuery);
      console.log('✅ Tabla users creada o verificada');
      
      // Crear usuario admin por defecto si no existe
      await this.createDefaultAdmin();
      
      connection.release();
    } catch (error) {
      console.error('❌ Error creando tabla users:', error);
      throw error;
    }
  }

  // Crear usuario administrador por defecto
  async createDefaultAdmin() {
    try {
      const adminEmail = 'admin@culturalaccess.com';
      const adminPassword = 'admin123';
      
      // Verificar si ya existe el admin
      const existingAdmin = await this.findByEmail(adminEmail);
      if (existingAdmin) {
        console.log('✅ Usuario admin ya existe');
        return;
      }

      // Crear hash de la contraseña
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const connection = await this.pool.getConnection();
      const query = `
        INSERT INTO users (email, password, name, role, is_active) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await connection.execute(query, [
        adminEmail,
        hashedPassword,
        'Administrador',
        'admin',
        true
      ]);
      
      console.log('✅ Usuario admin creado por defecto');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Contraseña: ${adminPassword}`);
      
      connection.release();
    } catch (error) {
      console.error('❌ Error creando usuario admin:', error);
    }
  }

  // Buscar usuario por email
  async findByEmail(email) {
    try {
      const connection = await this.pool.getConnection();
      const query = 'SELECT * FROM users WHERE email = ? AND is_active = true';
      const [rows] = await connection.execute(query, [email]);
      connection.release();
      
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error buscando usuario por email:', error);
      throw error;
    }
  }

  // Buscar usuario por ID
  async findById(id) {
    try {
      const connection = await this.pool.getConnection();
      const query = 'SELECT * FROM users WHERE id = ? AND is_active = true';
      const [rows] = await connection.execute(query, [id]);
      connection.release();
      
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error buscando usuario por ID:', error);
      throw error;
    }
  }

  // Verificar contraseña
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('❌ Error verificando contraseña:', error);
      throw error;
    }
  }

  // Generar JWT token
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  // Verificar JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Crear nuevo usuario
  async create(userData) {
    try {
      const { email, password, name, role = 'user' } = userData;
      
      // Verificar si el email ya existe
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const connection = await this.pool.getConnection();
      const query = `
        INSERT INTO users (email, password, name, role, is_active) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const [result] = await connection.execute(query, [
        email,
        hashedPassword,
        name,
        role,
        true
      ]);
      
      connection.release();
      
      return {
        id: result.insertId,
        email,
        name,
        role
      };
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      throw error;
    }
  }

  // Actualizar usuario
  async update(id, userData) {
    try {
      const { email, name, role } = userData;
      
      const connection = await this.pool.getConnection();
      const query = `
        UPDATE users 
        SET email = ?, name = ?, role = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND is_active = true
      `;
      
      await connection.execute(query, [email, name, role, id]);
      connection.release();
      
      return { id, email, name, role };
    } catch (error) {
      console.error('❌ Error actualizando usuario:', error);
      throw error;
    }
  }

  // Eliminar usuario (soft delete)
  async delete(id) {
    try {
      const connection = await this.pool.getConnection();
      const query = 'UPDATE users SET is_active = false WHERE id = ?';
      
      await connection.execute(query, [id]);
      connection.release();
      
      return { message: 'Usuario eliminado correctamente' };
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      throw error;
    }
  }

  // Obtener todos los usuarios
  async getAll() {
    try {
      const connection = await this.pool.getConnection();
      const query = 'SELECT id, email, name, role, created_at FROM users WHERE is_active = true';
      const [rows] = await connection.execute(query);
      connection.release();
      
      return rows;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      throw error;
    }
  }
}

module.exports = User;
