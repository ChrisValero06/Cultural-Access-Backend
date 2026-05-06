require('dotenv').config();

const { sendRedencionEmail } = require('./utils/emailSender-redencion');

// Datos de prueba
const datosPrueba = {
    institucion: 'Museo de Arte Contemporáneo',
    numero_tarjeta: 'TEST123',
    fecha: '2024-01-15',
    tipo_promocion: 'Descuento 50%'
};

console.log('🧪 ===== PRUEBA DIRECTA DE ENVÍO DE EMAIL =====');
console.log('📋 Datos de prueba:', datosPrueba);
console.log('');

// Ejecutar prueba
sendRedencionEmail(datosPrueba)
    .then((info) => {
        console.log('');
        console.log('✅ ===== PRUEBA EXITOSA =====');
        console.log('📧 Email enviado correctamente');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);
        console.log('');
        console.log('⚠️ Si no recibes el email, verifica:');
        console.log('  1. Carpeta de SPAM');
        console.log('  2. Filtros de email');
        console.log('  3. Que EMAIL_TO_REDENCION sea correcto');
        process.exit(0);
    })
    .catch((error) => {
        console.log('');
        console.error('❌ ===== PRUEBA FALLIDA =====');
        console.error('Error:', error.message);
        console.error('Código:', error.code);
        console.error('Respuesta:', error.response);
        console.error('');
        console.error('Verifica:');
        console.error('1. Que las variables de entorno estén configuradas en .env');
        console.error('2. Que EMAIL_USER_REDENCION y EMAIL_PASS_REDENCION sean correctos');
        console.error('3. Que EMAIL_TO_REDENCION tenga un email válido');
        console.error('4. Que la contraseña de aplicación de Gmail sea correcta');
        process.exit(1);
    });

