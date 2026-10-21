// Controlador principal de la aplicación cliente y conexión con Socket.IO
const SalemApp = {
  socket: null,
  roomCode: null,
  selectedAvatar: '🧙‍♂️',
  currentChannel: 'TOWN',
  willDebounceTimer: null,

  init() {
    this.socket = io();
    SalemUI.init();
    this.setupSocketEvents();
    this.setupDOMEvents();
    this.checkUrlForRoomCode();
    SalemUI.renderRoleGuide('ALL');
  },

  // Revisar si el jugador entró mediante un enlace de invitación ?room=XXXXX
  checkUrlForRoomCode() {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      const roomInput = document.getElementById('input-join-code');
      if (roomInput) {
        roomInput.value = roomFromUrl.toUpperCase();
        SalemUI.showToast(`Invitación a la sala ${roomFromUrl.toUpperCase()} detectada. Ingresa tu nombre para unirte.`);
      }
    }
  },

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Conectado al servidor de Salem. Socket ID:', this.socket.id);
    });

    this.socket.on('lobby_state', (data) => {
      this.roomCode = data.roomCode;
      SalemUI.renderLobby(data, this.socket.id);
    });

    this.socket.on('game_state', (state) => {
      SalemUI.renderGameState(state, this.socket.id);
    });

    this.socket.on('chat_message', (msg) => {
      SalemUI.appendChatMessage(msg, this.socket.id);
    });

    this.socket.on('private_message', (data) => {
      SalemUI.showToast(data.text, 'info');
      SalemUI.appendChatMessage({
        senderName: 'Salem (Secreto)',
        text: data.text,
        channel: 'SYSTEM'
      }, this.socket.id);
    });

    this.socket.on('trial_result', (verdictData) => {
      if (window.salemAudio) {
        window.salemAudio.playGavel();
      }
      if (verdictData.isGuilty) {
        SalemUI.showToast(`🪓 ¡${verdictData.accusedName} ha sido ejecutado en el patíbulo!`, 'error');
      } else {
        SalemUI.showToast(`🕊️ ¡${verdictData.accusedName} fue declarado inocente!`, 'success');
      }
    });

    this.socket.on('dawn_announcement', (dawnData) => {
      SalemUI.renderDawnAnnouncement(dawnData);
    });

    this.socket.on('game_over', (finalData) => {
      SalemUI.renderGameOver(finalData);
    });

    this.socket.on('timer_tick', (data) => {
      const timerEl = document.getElementById('timer-number');
      const timerBox = document.getElementById('timer-box');
      if (timerEl) {
        timerEl.textContent = data.timeLeft;
        if (data.timeLeft <= 10) {
          timerBox.classList.add('timer-urgent');
        } else {
          timerBox.classList.remove('timer-urgent');
        }
      }
    });

    this.socket.on('disconnect', () => {
      SalemUI.showToast('Conexión perdida con el servidor de Salem.', 'error');
    });
  },

  setupDOMEvents() {
    // Selección de avatar
    document.querySelectorAll('.avatar-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.selectedAvatar = opt.dataset.avatar || opt.textContent.trim();
        if (window.salemAudio) window.salemAudio.playClick();
      });
    });

    // Pestañas de chat
    document.querySelectorAll('.chat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentChannel = tab.dataset.channel || 'TOWN';
        SalemUI.currentChatTab = this.currentChannel;
        if (window.salemAudio) window.salemAudio.playClick();
      });
    });

    // Envío de chat con Enter
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendChat();
        }
      });
    }

    // Auto-guardado de testamento mientras escribe
    const willTextarea = document.getElementById('will-textarea');
    if (willTextarea) {
      willTextarea.addEventListener('input', () => {
        clearTimeout(this.willDebounceTimer);
        this.willDebounceTimer = setTimeout(() => {
          this.saveWill(willTextarea.value);
        }, 800);
      });
    }

    // Filtros de la guía de roles
    document.querySelectorAll('.role-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.role-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SalemUI.renderRoleGuide(btn.dataset.faction);
        if (window.salemAudio) window.salemAudio.playClick();
      });
    });
  },

  // ==================== ACCIONES DE SALA ====================
  createRoom() {
    const nameInput = document.getElementById('input-host-name');
    const playerName = nameInput ? nameInput.value.trim() : '';
    if (!playerName) {
      SalemUI.showToast('Por favor, ingresa tu nombre de habitante.', 'error');
      return;
    }

    if (window.salemAudio) window.salemAudio.init();

    this.socket.emit('create_room', {
      playerName,
      avatar: this.selectedAvatar
    }, (res) => {
      if (res.success) {
        this.roomCode = res.roomCode;
        SalemUI.showToast(`¡Sala ${res.roomCode} creada con éxito!`, 'success');
      } else {
        SalemUI.showToast(res.message || 'Error al crear la sala.', 'error');
      }
    });
  },

  joinRoom() {
    const nameInput = document.getElementById('input-join-name');
    const codeInput = document.getElementById('input-join-code');
    const playerName = nameInput ? nameInput.value.trim() : '';
    const roomCode = codeInput ? codeInput.value.trim().toUpperCase() : '';

    if (!playerName) {
      SalemUI.showToast('Por favor, ingresa tu nombre de habitante.', 'error');
      return;
    }
    if (!roomCode) {
      SalemUI.showToast('Por favor, ingresa el código de la sala.', 'error');
      return;
    }

    if (window.salemAudio) window.salemAudio.init();

    this.socket.emit('join_room', {
      roomCode,
      playerName,
      avatar: this.selectedAvatar
    }, (res) => {
      if (res.success) {
        this.roomCode = res.roomCode;
        SalemUI.showToast(`¡Te has unido a la sala ${res.roomCode}!`, 'success');
      } else {
        SalemUI.showToast(res.message || 'No se pudo unir a la sala.', 'error');
      }
    });
  },

  copyInviteLink() {
    if (!this.roomCode) return;
    const url = `${window.location.origin}/?room=${this.roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      SalemUI.showToast('¡Enlace de invitación copiado al portapapeles! Envíalo a tus amigos.', 'success');
    }).catch(() => {
      SalemUI.showToast(`Comparte este código con tus amigos: ${this.roomCode}`, 'info');
    });
  },

  addBot() {
    this.socket.emit('add_bot');
  },

  fillBots(count = 6) {
    this.socket.emit('fill_bots', { count });
    SalemUI.showToast(`Rellenando la sala con bots hasta ${count} jugadores...`);
  },

  quickPlayWithBots() {
    if (window.salemAudio) window.salemAudio.init();
    SalemUI.showToast('🤖 Añadiendo bots y comenzando la partida...', 'info');
    this.socket.emit('fill_bots', { count: 6 });
    setTimeout(() => {
      this.startGame();
    }, 600);
  },

  removeBot(botId) {
    this.socket.emit('remove_bot', { botId });
  },

  startGame() {
    this.socket.emit('start_game', {}, (res) => {
      if (res && !res.success) {
        SalemUI.showToast(res.message || 'No se pudo iniciar la partida.', 'error');
      }
    });
  },

  // ==================== ACCIONES DE PARTIDA ====================
  sendChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (this.currentChannel === 'JAIL') {
      this.socket.emit('send_jail_chat', { text });
    } else {
      this.socket.emit('send_chat', { text, channel: this.currentChannel });
    }

    input.value = '';
  },

  nominatePlayer(targetId) {
    this.socket.emit('nominate_player', { targetId });
  },

  castTrialVote(verdict) {
    this.socket.emit('cast_trial_vote', { verdict });
    SalemUI.showToast(`Has votado: ${verdict === 'GUILTY' ? '🔴 Culpable' : verdict === 'INNOCENT' ? '🟢 Inocente' : '⚪ Abstenerse'}`);
    if (window.salemAudio) window.salemAudio.playGavel();
  },

  submitNightAction(actionData) {
    this.socket.emit('submit_night_action', { actionData });
  },

  saveWill(text) {
    const willText = text !== undefined ? text : (document.getElementById('will-textarea')?.value || '');
    this.socket.emit('save_will', { willText });
    SalemUI.showToast('Testamento guardado.', 'info');
  },

  saveDeathNote() {
    const noteText = document.getElementById('death-note-textarea')?.value || '';
    this.socket.emit('save_death_note', { deathNoteText: noteText });
    SalemUI.showToast('Nota de muerte guardada.', 'info');
    SalemUI.closeModal('modal-death-note');
  },

  revealMayor() {
    this.socket.emit('reveal_mayor');
  },

  jailTarget(targetId) {
    this.socket.emit('jail_target', { targetId });
    SalemUI.showToast('Has seleccionado encarcelar a este sospechoso esta noche.');
  },

  restartLobby() {
    SalemUI.tarotShownForGame = false;
    SalemUI.lastPhase = null;
    this.socket.emit('restart_lobby');
    SalemUI.closeModal('modal-game-over');
    SalemUI.switchView('view-lobby');
  },

  toggleSound() {
    const isMuted = window.salemAudio.toggleMute();
    const btn = document.getElementById('btn-sound-toggle');
    if (btn) {
      btn.innerHTML = isMuted ? '🔇' : '🔊';
      btn.title = isMuted ? 'Activar sonido' : 'Silenciar';
    }
    SalemUI.showToast(isMuted ? 'Sonido silenciado' : 'Sonido activado');
  }
};

window.SalemApp = SalemApp;
window.SalemUI = SalemUI;

document.addEventListener('DOMContentLoaded', () => {
  SalemApp.init();
});
