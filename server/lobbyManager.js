// Gestor de Salas (Lobbies) y enrutamiento de eventos de Socket.IO
const SalemGame = require('./game');

class LobbyManager {
  constructor(io) {
    this.io = io;
    this.games = new Map(); // roomCode -> SalemGame
    this.socketToRoom = new Map(); // socketId -> roomCode
  }

  // Genera un código de sala de 5 caracteres alfanuméricos fácil de recordar
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.games.has(code));
    return code;
  }

  setupSocketHandlers(socket) {
    // 1. Crear una sala nueva
    socket.on('create_room', (data, callback) => {
      try {
        const playerName = (data.playerName || 'Anfitrión').trim();
        const avatar = data.avatar || '🧙‍♂️';
        const roomCode = this.generateRoomCode();

        const game = new SalemGame(roomCode, socket.id, playerName, this.io);
        // Guardar avatar
        if (game.players[0]) {
          game.players[0].avatar = avatar;
        }

        this.games.set(roomCode, game);
        this.socketToRoom.set(socket.id, roomCode);
        socket.join(roomCode);

        console.log(`[SALA CREADA] Sala: ${roomCode} por ${playerName} (${socket.id})`);

        if (typeof callback === 'function') {
          callback({ success: true, roomCode });
        }
      } catch (err) {
        console.error('Error al crear sala:', err);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'No se pudo crear la sala.' });
        }
      }
    });

    // 2. Unirse a una sala existente
    socket.on('join_room', (data, callback) => {
      try {
        const roomCode = (data.roomCode || '').toUpperCase().trim();
        const playerName = (data.playerName || 'Jugador').trim();
        const avatar = data.avatar || '🕵️‍♂️';

        const game = this.games.get(roomCode);
        if (!game) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'La sala no existe o el código es incorrecto.' });
          }
          return;
        }

        if (game.phase !== 'LOBBY') {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'La partida ya ha comenzado en esta sala.' });
          }
          return;
        }

        if (game.players.length >= 15) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'La sala está completa (máximo 15 jugadores).' });
          }
          return;
        }

        const player = game.addPlayer(socket.id, playerName, false, false, avatar);
        if (!player) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'No se pudo unir a la sala.' });
          }
          return;
        }

        this.socketToRoom.set(socket.id, roomCode);
        socket.join(roomCode);

        console.log(`[JUGADOR UNIDO] ${playerName} a la sala ${roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true, roomCode });
        }
      } catch (err) {
        console.error('Error al unirse a la sala:', err);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Error interno al unirse a la sala.' });
        }
      }
    });

    // 3. Añadir bot
    socket.on('add_bot', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        game.addBot();
      }
    });

    // 4. Rellenar con bots hasta 6 u 8 jugadores
    socket.on('fill_bots', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        const targetCount = data.count || 6;
        game.fillWithBots(targetCount);
      }
    });

    // 5. Eliminar bot
    socket.on('remove_bot', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (player && player.isHost && data.botId) {
        game.removeBot(data.botId);
      }
    });

    // 6. Iniciar partida
    socket.on('start_game', (data, callback) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) {
        if (typeof callback === 'function') {
          return callback({ success: false, message: 'Solo el anfitrión puede iniciar la partida.' });
        }
        return;
      }

      const res = game.startGame();
      if (typeof callback === 'function') {
        callback(res);
      }
    });

    // 7. Enviar mensaje de chat
    socket.on('send_chat', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.handleChatMessage(socket.id, data.text, data.channel || 'TOWN');
    });

    // 8. Enviar mensaje de cárcel (Jailor / Prisionero)
    socket.on('send_jail_chat', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.sendJailChat(socket.id, data.text);
    });

    // 9. Votar para llevar a juicio (Nominación)
    socket.on('nominate_player', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.handleVote(socket.id, data.targetId);
    });

    // 10. Voto en juicio (Culpable / Inocente / Abstenerse)
    socket.on('cast_trial_vote', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.handleTrialVote(socket.id, data.verdict);
    });

    // 11. Registrar acción nocturna
    socket.on('submit_night_action', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.setNightAction(socket.id, data.actionData);
    });

    // 12. Guardar testamento (Last Will)
    socket.on('save_will', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.updateWill(socket.id, data.willText || '');
    });

    // 13. Guardar nota de muerte (Death Note)
    socket.on('save_death_note', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.updateDeathNote(socket.id, data.deathNoteText || '');
    });

    // 14. Habilidad del Alcalde (Revelarse)
    socket.on('reveal_mayor', () => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.revealMayor(socket.id);
    });

    // 15. Habilidad diurna del Carcelero (Encarcelar)
    socket.on('jail_target', (data) => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      game.jailPlayer(socket.id, data.targetId);
    });

    // 16. Reiniciar y volver a la sala
    socket.on('restart_lobby', () => {
      const roomCode = this.socketToRoom.get(socket.id);
      const game = this.games.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        game.phase = 'LOBBY';
        game.clearPhaseTimer();
        game.broadcastLobbyState();
      }
    });

    // 17. Desconexión
    socket.on('disconnect', () => {
      const roomCode = this.socketToRoom.get(socket.id);
      if (!roomCode) return;

      const game = this.games.get(roomCode);
      if (game) {
        game.removePlayer(socket.id);
        // Si no quedan jugadores humanos en la sala, destruir el juego para liberar memoria
        const humanCount = game.players.filter(p => !p.isBot).length;
        if (humanCount === 0) {
          game.clearPhaseTimer();
          this.games.delete(roomCode);
          console.log(`[SALA CERRADA] Sala vacía eliminada: ${roomCode}`);
        }
      }

      this.socketToRoom.delete(socket.id);
    });
  }
}

module.exports = LobbyManager;
