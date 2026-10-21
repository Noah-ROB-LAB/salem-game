#!/usr/bin/env node
const localtunnel = require('localtunnel');

const PORT = process.env.PORT || 3000;

(async () => {
  console.log('🔮 Conectando con la red para crear tu enlace público...');
  try {
    const tunnel = await localtunnel({ port: PORT });
    console.log('\n=============================================================');
    console.log('🏰  TOWN OF SALEM: SALA ONLINE DISPONIBLE PARA TUS AMIGOS');
    console.log('=============================================================');
    console.log(`\n👉 ENLACE PÚBLICO: \x1b[32m\x1b[1m${tunnel.url}\x1b[0m\n`);
    console.log('Copia este enlace y envíaselo por WhatsApp / Discord a tus amigos.');
    console.log('¡Pueden entrar desde su ordenador o móvil desde sus casas!');
    console.log('=============================================================\n');

    tunnel.on('close', () => {
      console.log('El túnel se ha cerrado.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error al generar enlace público:', err.message);
  }
})();
