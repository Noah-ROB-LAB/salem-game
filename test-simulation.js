const { io } = require('socket.io-client');

async function testGameFlow() {
  console.log('🧪 Iniciando prueba automatizada del juego Salem...');

  const client1 = io('http://localhost:3000');
  const client2 = io('http://localhost:3000');

  await new Promise(r => client1.on('connect', r));
  await new Promise(r => client2.on('connect', r));

  console.log('✅ Clientes conectados al servidor');

  let roomCode = '';

  // 1. Crear sala
  await new Promise((resolve, reject) => {
    client1.emit('create_room', { playerName: 'Dan Host', avatar: '🧙‍♂️' }, (res) => {
      if (res.success) {
        roomCode = res.roomCode;
        console.log(`✅ Sala creada: ${roomCode}`);
        resolve();
      } else {
        reject(res.message);
      }
    });
  });

  // 2. Unir cliente 2
  await new Promise((resolve, reject) => {
    client2.emit('join_room', { roomCode, playerName: 'Amigo 1', avatar: '🕵️‍♂️' }, (res) => {
      if (res.success) {
        console.log(`✅ Amigo 1 se unió a la sala ${roomCode}`);
        resolve();
      } else {
        reject(res.message);
      }
    });
  });

  // 3. Rellenar con bots
  client1.emit('fill_bots', { count: 5 });

  // Esperar a que se actualice la sala
  await new Promise(r => setTimeout(r, 1000));

  // 4. Iniciar partida
  const started = await new Promise((resolve) => {
    client1.emit('start_game', {}, (res) => {
      console.log('✅ start_game emitido:', res);
      resolve(res.success);
    });
  });

  if (!started) {
    throw new Error('Fallo al iniciar partida');
  }

  // 5. Verificar recepción de roles
  await new Promise(resolve => {
    client1.on('game_state', (state) => {
      if (state.myPlayer && state.myPlayer.role) {
        console.log(`✅ Cliente 1 recibió rol: ${state.myPlayer.role.name} (${state.myPlayer.role.faction})`);
        resolve();
      }
    });
  });

  console.log('🎉 ¡Todas las pruebas automáticas superadas con éxito!');
  client1.disconnect();
  client2.disconnect();
}

testGameFlow().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
