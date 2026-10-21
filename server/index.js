const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const LobbyManager = require('./lobbyManager');
const { ROLES, FACTIONS } = require('./roles');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint para obtener la lista de roles
app.get('/api/roles', (req, res) => {
  res.json({ roles: ROLES, factions: FACTIONS });
});

// Inicializar el gestor de salas y sockets
const lobbyManager = new LobbyManager(io);
io.on('connection', (socket) => {
  lobbyManager.setupSocketHandlers(socket);
});

// Obtener IP local de la máquina para compartir en la red local
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, async () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('⚔️  TOWN OF SALEM: WEB EDITION INICIADO CON ÉXITO');
  console.log('====================================================');
  console.log(`🏠 En tu propio ordenador:  http://localhost:${PORT}`);
  console.log(`📱 En tu misma red Wi-Fi:   http://${localIp}:${PORT}`);
  console.log('====================================================');

  // Si se pasa el argumento --tunnel o TUNNEL=true, abrir túnel público instantáneo
  if (process.argv.includes('--tunnel') || process.env.TUNNEL === 'true') {
    try {
      const localtunnel = require('localtunnel');
      console.log('🌐 Conectando túnel público para jugar por Internet...');
      const tunnel = await localtunnel({ port: PORT });
      console.log('====================================================');
      console.log(`🌍 ¡ENLACE PÚBLICO PARA TUS AMIGOS!: ${tunnel.url}`);
      console.log('   Pásales este enlace para que se unan desde sus casas.');
      console.log('====================================================');

      tunnel.on('close', () => {
        console.log('⚠️ El túnel público se ha cerrado.');
      });
    } catch (err) {
      console.error('No se pudo abrir el túnel automático:', err.message);
      console.log('Tip: Puedes usar `npm run share` o ngrok / cloudflared.');
    }
  }
});
