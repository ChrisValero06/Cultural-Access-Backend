require('dotenv').config();

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// ⭐⭐ CARGAR VARIABLES DE ENTORNO DESDE MÚLTIPLES UBICACIONES
const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '../.env')
];

for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log('✅ Variables de entorno cargadas desde:', envPath);
        break;
    }
}

// Configuración del transporter de Nodemailer con opciones mejoradas
const emailPort = parseInt(process.env.EMAIL_PORT || '465');
const isSecurePort = emailPort === 465 || emailPort === 994; // Puertos SSL/TLS

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: emailPort,
    secure: isSecurePort || process.env.EMAIL_SECURE === 'true', // true para 465 (SSL), false para 587 (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false, // Para desarrollo/testing con certificados autofirmados
        // No usar ciphers específicos para puerto 465, dejar que Node.js maneje SSL/TLS
    },
    connectionTimeout: 15000, // 15 segundos para establecer conexión (aumentado para SSL)
    greetingTimeout: 15000, // 15 segundos para saludo SMTP
    socketTimeout: 15000, // 15 segundos para operaciones de socket
    // Opciones adicionales para mejorar la estabilidad
    pool: true, // Reutilizar conexiones
    maxConnections: 1,
    maxMessages: 3,
    rateDelta: 1000,
    rateLimit: 5
});

console.log('📧 Configuración SMTP:');
console.log('   Host:', process.env.EMAIL_HOST);
console.log('   Port:', emailPort);
console.log('   Secure:', isSecurePort || process.env.EMAIL_SECURE === 'true');
console.log('   User:', process.env.EMAIL_USER);

/**
 * Función para enviar correo de redención
 * @param {Object} data - Datos de la redención
 * @param {string} data.institucion - Nombre de la institución
 * @param {string} data.numero_tarjeta - Número de tarjeta
 * @param {string} data.fecha - Fecha de la redención
 * @param {string|null} data.tipo_promocion - Tipo de promoción (opcional)
 * @returns {Promise} - Promise que resuelve con la información del envío
 */
async function sendRedencionEmail(data) {
    try {
        // Obtener destinatarios desde .env
        const destinatariosEmail = process.env.EMAIL_TO_REDENCION || '';
        const destinatarios = destinatariosEmail.includes(',')
            ? destinatariosEmail.split(',').map(email => email.trim())
            : (destinatariosEmail.trim() ? [destinatariosEmail.trim()] : []);

        console.log('📧 ===== ENVIANDO CORREO DE REDENCIÓN =====');
        console.log('📧 Datos recibidos:', JSON.stringify(data, null, 2));
        console.log('📧 EMAIL_TO_REDENCION:', process.env.EMAIL_TO_REDENCION);
        console.log('📧 Destinatarios procesados:', JSON.stringify(destinatarios, null, 2));
        console.log('📧 Total destinatarios:', destinatarios.length);

        if (destinatarios.length === 0) {
            throw new Error('No hay destinatarios configurados en EMAIL_TO_REDENCION');
        }

        // Formatear fecha para mostrar
        const fechaFormateada = data.fecha 
            ? new Date(data.fecha).toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
            : 'No especificada';

        // Construir HTML del correo con información de destinatarios
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Redención - Cultural Access</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #ff6b35;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .info-section {
            background-color: #f9f9f9;
            border-left: 4px solid #ff6b35;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-row {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 180px;
        }
        .info-value {
            color: #333;
        }
        .destinatarios-section {
            background-color: #e8f4f8;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .destinatarios-section h3 {
            margin-top: 0;
            color: #1976D2;
        }
        .destinatario-item {
            padding: 5px 0;
            color: #333;
        }
        .footer {
            background-color: #f5f5f5;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Nueva Redención Registrada</h1>
        </div>
        
        <div class="content">
            <h2>Información de la Redención</h2>
            
            <div class="info-section">
                <div class="info-row">
                    <span class="info-label">Institución:</span>
                    <span class="info-value">${data.institucion || 'No especificada'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Número de Tarjeta:</span>
                    <span class="info-value">${data.numero_tarjeta || 'No especificado'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">${fechaFormateada}</span>
                </div>
                ${data.tipo_promocion ? `
                <div class="info-row">
                    <span class="info-label">Tipo de Promoción:</span>
                    <span class="info-value">${data.tipo_promocion}</span>
                </div>
                ` : ''}
            </div>

            <!-- ⭐⭐ NUEVA SECCIÓN: Información de Destinatarios -->
            <div class="destinatarios-section">
                <h3>📧 Información de Correos Destinatarios</h3>
                <div class="info-row">
                    <span class="info-label">Total Destinatarios:</span>
                    <span class="info-value"><strong>${destinatarios.length}</strong></span>
                </div>
                <div style="margin-top: 10px;">
                    <strong>Correos Destinatarios:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${destinatarios.map((email, index) => `
                        <li class="destinatario-item">${index + 1}. ${email}</li>
                        `).join('')}
                    </ul>
                </div>
                <div class="info-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #b3d9f2;">
                    <span class="info-label">Estado:</span>
                    <span class="info-value" style="color: #4CAF50; font-weight: bold;">✓ Correo enviado a ${destinatarios.length} destinatario(s)</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Este es un correo automático del sistema Cultural Access.</p>
            <p>Fecha de envío: ${new Date().toLocaleString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
        </div>
    </div>
</body>
</html>
        `;

        // Versión texto plano del correo
        const textContent = `
NUEVA REDENCIÓN REGISTRADA

Información de la Redención:
- Institución: ${data.institucion || 'No especificada'}
- Número de Tarjeta: ${data.numero_tarjeta || 'No especificado'}
- Fecha: ${fechaFormateada}
${data.tipo_promocion ? `- Tipo de Promoción: ${data.tipo_promocion}` : ''}

📧 Información de Correos Destinatarios:
- Total Destinatarios: ${destinatarios.length}
- Correos Destinatarios:
${destinatarios.map((email, index) => `  ${index + 1}. ${email}`).join('\n')}
- Estado: ✓ Correo enviado a ${destinatarios.length} destinatario(s)

---
Este es un correo automático del sistema Cultural Access.
Fecha de envío: ${new Date().toLocaleString('es-MX')}
        `;

        // Configurar opciones del correo
        const mailOptions = {
            from: `"Cultural Access" <${process.env.EMAIL_USER}>`,
            to: destinatarios,
            subject: `🎫 Nueva Redención - ${data.institucion || 'Cultural Access'}`,
            html: htmlContent,
            text: textContent
        };

        console.log('📧 Opciones de correo configuradas:');
        console.log('   From:', mailOptions.from);
        console.log('   To:', JSON.stringify(mailOptions.to, null, 2));
        console.log('   Subject:', mailOptions.subject);

        // ⭐⭐ Verificar conexión antes de enviar
        try {
            await transporter.verify();
            console.log('✅ Conexión SMTP verificada correctamente');
        } catch (verifyError) {
            console.warn('⚠️ Advertencia al verificar conexión SMTP:', verifyError.message);
            console.warn('   Continuando con el envío de todas formas...');
        }

        // Enviar correo con timeout
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: El envío del correo tardó demasiado')), 30000); // 30 segundos
        });

        const info = await Promise.race([sendPromise, timeoutPromise]);

        console.log('✅ Correo enviado exitosamente');
        console.log('   Message ID:', info.messageId);
        console.log('   Correos aceptados:', JSON.stringify(info.accepted, null, 2));
        console.log('   Correos rechazados:', JSON.stringify(info.rejected, null, 2));
        console.log('   Respuesta del servidor:', info.response);

        return info;

    } catch (error) {
        console.error('❌ Error enviando correo de redención:');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        throw error;
    }
}

module.exports = { sendRedencionEmail };

