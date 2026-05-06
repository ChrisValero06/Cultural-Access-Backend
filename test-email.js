require('dotenv').config();

const { sendRegistrationEmail } = require('./utils/emailSender');

// Datos de prueba
const datosPrueba = {
    nombre: 'JUAN',
    apellido_paterno: 'PEREZ',
    apellido_materno: 'GARCIA',
    email: 'christophervalero05@hotmail.com', // Email donde quieres recibir la prueba
    curp: 'PEGJ850101HNLRRN01',
    numero_tarjeta: '00123'
};

console.log('🧪 Iniciando prueba de envío de correo...');
console.log('📧 Enviando correo de prueba a:', datosPrueba.email);
console.log('📋 Datos de prueba:', datosPrueba);
console.log('');

sendRegistrationEmail(datosPrueba)
    .then(info => {
        console.log('');
        console.log('✅ ¡PRUEBA EXITOSA!');
        console.log('📨 Correo enviado correctamente');
        console.log('📬 Message ID:', info.messageId);
        console.log('📧 Respuesta del servidor:', info.response);
        console.log('');
        console.log('Revisa la bandeja de entrada (y spam) de:', datosPrueba.email);
        process.exit(0);
    })
    .catch(error => {
        console.log('');
        console.error('❌ ERROR EN LA PRUEBA');
        console.error('Detalles del error:', error.message);
        if (error.response) {
            console.error('Respuesta del servidor:', error.response);
        }
        if (error.responseCode) {
            console.error('Código de respuesta:', error.responseCode);
        }
        console.error('');
        console.error('Stack completo:', error);
        process.exit(1);
    });
