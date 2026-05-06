// Script de prueba para el servicio de email de promociones
require('dotenv').config();

// Intentar importar desde diferentes rutas posibles
let sendPromocionEmail;

try {
    // Intentar desde la raíz del proyecto
    const emailService = require('./emailSender-promocion');
    sendPromocionEmail = emailService.sendPromocionEmail;
} catch (error) {
    try {
        // Intentar desde services/
        const emailService = require('./utils/emailSender-promocion');
        sendPromocionEmail = emailService.sendPromocionEmail;
    } catch (error2) {
        try {
            // Intentar desde backend/services/
            const emailService = require('./backend/services/emailService-promociones');
            sendPromocionEmail = emailService.sendPromocionEmail;
        } catch (error3) {
            console.error('❌ No se pudo encontrar el módulo emailService-promociones');
            console.error('Intentos:');
            console.error('1. ./emailService-promociones:', error.message);
            console.error('2. ./services/emailService-promociones:', error2.message);
            console.error('3. ./backend/services/emailService-promociones:', error3.message);
            process.exit(1);
        }
    }
}

// Datos de prueba
const testData = {
    institucion: 'Museo de Arte Contemporáneo',
    tipo_promocion: 'Descuentos',
    disciplina: 'Artes Plásticas',
    beneficios: '50% de descuento en entrada general',
    comentarios_restricciones: 'Válido solo los fines de semana',
    fecha_inicio: '2024-12-01',
    fecha_fin: '2024-12-31'
};

console.log('🧪 Iniciando prueba de email de promociones...');
console.log('📧 Datos de prueba:', JSON.stringify(testData, null, 2));

// Enviar email de prueba
sendPromocionEmail(testData)
    .then((info) => {
        console.log('✅ Email enviado exitosamente!');
        console.log('📬 Respuesta del servidor:', info.response);
        console.log('🆔 Message ID:', info.messageId);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error al enviar el email:', error);
        console.error('Detalles:', error.message);
        process.exit(1);
    });

