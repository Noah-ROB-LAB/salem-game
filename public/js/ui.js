// Controlador visual y de interfaz de usuario para Salem (Town of Salem 2 Web Edition)
const SalemUI = {
  currentView: 'view-lobby',
  selectedCitizenId: null,
  selectedSecondCitizenId: null,
  currentChatTab: 'TOWN',
  unreadChatCounts: { TOWN: 0, COVEN: 0, JAIL: 0, DEAD: 0, SYSTEM: 0 },
  lastPhase: null,
  tarotShownForGame: false,

  init() {
    this.setupModalDismissers();
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : '📜';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      if (window.salemAudio) window.salemAudio.playClick();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      if (window.salemAudio) window.salemAudio.playClick();
    }
  },

  setupModalDismissers() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });
  },

  switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      this.currentView = viewId;
    }
  },

  // ==================== BANNER DE TRANSICIÓN DE FASE ====================
  showPhaseBanner(title, icon = '☀️') {
    let banner = document.getElementById('phase-transition-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'phase-transition-banner';
      banner.className = 'phase-transition-banner';
      document.body.appendChild(banner);
    }

    banner.innerHTML = `
      <span class="phase-transition-icon">${icon}</span>
      <span class="phase-transition-text">${title}</span>
    `;

    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
    }, 2800);
  },

  // ==================== TARJETA DE ROL 3D (TAROT CARD ANIMATION) ====================
  showTarotRoleCard(role) {
    if (!role) return;

    if (window.salemAudio) {
      window.salemAudio.playSuspense();
    }

    let overlay = document.getElementById('role-reveal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'role-reveal-overlay';
      overlay.className = 'role-reveal-modal';
      document.body.appendChild(overlay);
    }

    const factionAura = role.faction === 'COVEN' ? 'coven-aura' : role.faction === 'NEUTRAL' ? 'neutral-aura' : '';

    overlay.innerHTML = `
      <div class="tarot-card-container">
        <div id="tarot-card-inner" class="tarot-card">
          <!-- Cara frontal (Misterio de Salem) -->
          <div class="tarot-face tarot-front">
            <div class="tarot-front-symbol">👁️</div>
            <h3 style="font-family: var(--font-serif); color: var(--gold-accent); letter-spacing: 3px; margin-top: 16px;">SALEM</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">Descubriendo tu destino...</p>
          </div>
          <!-- Cara trasera (Tu Rol Revelado) -->
          <div class="tarot-face tarot-back ${factionAura}">
            <div class="tarot-role-icon">${role.icon || '📜'}</div>
            <div class="tarot-role-title">${role.name}</div>
            <div class="tarot-faction-badge" style="background: ${role.color}33; color: ${role.color}; border: 1px solid ${role.color}">
              ${role.faction} • ${role.alignment || 'Poder'}
            </div>
            <div class="tarot-goal-box">
              <strong>Objetivo:</strong> ${role.description || 'Cumple con tu destino en Salem.'}
            </div>
            <div class="tarot-ability-desc">
              ${(role.abilities && role.abilities[0]) || 'Usa tus habilidades durante la noche o el día.'}
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-gold btn-lg" onclick="SalemUI.dismissTarot()">
        ⚔️ Entendido, ¡a luchar!
      </button>
    `;

    overlay.style.display = 'flex';

    // Voltear la carta con animación 3D tras 600ms
    setTimeout(() => {
      const card = document.getElementById('tarot-card-inner');
      if (card) card.classList.add('flipped');
    }, 600);

    // Auto-cerrar al terminar el tiempo de revelación
    setTimeout(() => {
      this.dismissTarot();
    }, 7000);
  },

  dismissTarot() {
    const overlay = document.getElementById('role-reveal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '1';
      }, 500);
    }
  },

  // ==================== RENDERIZADO DEL LOBBY ====================
  renderLobby(lobbyData, myId) {
    const homeCards = document.getElementById('lobby-home-cards');
    const inRoomContainer = document.getElementById('in-room-container');
    const roomBadge = document.getElementById('header-room-badge');
    const roomCodeTag = document.getElementById('header-room-code');

    if (!lobbyData) {
      if (homeCards) homeCards.style.display = 'flex';
      if (inRoomContainer) inRoomContainer.style.display = 'none';
      if (roomBadge) roomBadge.style.display = 'none';
      return;
    }

    // En sala de espera
    if (homeCards) homeCards.style.display = 'none';
    if (inRoomContainer) inRoomContainer.style.display = 'flex';
    if (roomBadge) roomBadge.style.display = 'flex';
    if (roomCodeTag) roomCodeTag.textContent = lobbyData.roomCode;

    const inRoomCode = document.getElementById('in-room-code-display');
    if (inRoomCode) inRoomCode.textContent = lobbyData.roomCode;

    const grid = document.getElementById('players-lobby-grid');
    if (grid) {
      grid.innerHTML = '';
      lobbyData.players.forEach(p => {
        const isMe = p.id === myId;
        const slot = document.createElement('div');
        slot.className = `player-slot ${p.isHost ? 'host-slot' : ''} ${p.isBot ? 'bot-slot' : ''}`;

        let badges = '';
        if (p.isHost) badges += '<span class="player-slot-badge badge-host">👑 Anfitrión</span> ';
        if (p.isBot) badges += '<span class="player-slot-badge badge-bot">🤖 Bot</span> ';
        if (isMe) badges += '<span class="player-slot-badge badge-you">Tú</span> ';

        let botRemoveBtn = '';
        const myPlayer = lobbyData.players.find(pl => pl.id === myId);
        if (myPlayer && myPlayer.isHost && p.isBot) {
          botRemoveBtn = `<button class="btn-remove-bot" onclick="SalemApp.removeBot('${p.id}')" title="Eliminar bot">❌</button>`;
        }

        slot.innerHTML = `
          <div class="player-slot-avatar">${p.avatar}</div>
          <div class="player-slot-info">
            <div class="player-slot-name">${p.name}</div>
            <div>${badges}</div>
          </div>
          ${botRemoveBtn}
        `;
        grid.appendChild(slot);
      });
    }

    // Controles de anfitrión
    const myPlayer = lobbyData.players.find(p => p.id === myId);
    const hostControls = document.getElementById('host-controls-panel');
    const startBtn = document.getElementById('btn-start-game');
    const waitingHostMsg = document.getElementById('waiting-host-msg');

    if (myPlayer && myPlayer.isHost) {
      if (hostControls) hostControls.style.display = 'flex';
      if (waitingHostMsg) waitingHostMsg.style.display = 'none';
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = lobbyData.players.length < 4
          ? `⚔️ Iniciar Partida (Rellenará con bots)`
          : `⚔️ Iniciar Partida (${lobbyData.players.length} Jugadores)`;
      }
    } else {
      if (hostControls) hostControls.style.display = 'none';
      if (waitingHostMsg) waitingHostMsg.style.display = 'block';
    }
  },

  // ==================== RENDERIZADO DEL ESTADO DE JUEGO ====================
  renderGameState(state, myId) {
    this.switchView('view-game');

    // Detectar cambio de fase para animaciones
    if (this.lastPhase !== state.phase) {
      this.handlePhaseChange(state);
      this.lastPhase = state.phase;
    }

    // 1. Fase y temporizador en encabezado
    this.updatePhaseHeader(state);

    // 2. Jugadores en la plaza (Town Square)
    this.renderTownSquare(state, myId);

    // 3. Mi tarjeta de rol compacta
    this.renderMyRole(state.myPlayer);

    // 4. Panel de acciones según fase
    this.renderActionDeck(state, myId);

    // 5. Patíbulo / Juicio
    this.renderTrialStand(state, myId);
  },

  handlePhaseChange(state) {
    if (state.phase === 'ROLE_REVEAL' && !this.tarotShownForGame) {
      this.tarotShownForGame = true;
      if (state.myPlayer && state.myPlayer.role) {
        this.showTarotRoleCard(state.myPlayer.role);
      }
    } else if (state.phase === 'DAY_DISCUSSION') {
      this.showPhaseBanner(`¡Amanecer del Día ${state.dayNumber}!`, '☀️');
      if (window.salemAudio) window.salemAudio.playBell();
      document.body.classList.remove('night-time');
      document.body.classList.add('day-time');
    } else if (state.phase === 'DAY_NOMINATION') {
      this.showPhaseBanner('¡Comienzan las acusaciones al Patíbulo!', '⚖️');
      if (window.salemAudio) window.salemAudio.playGavel();
    } else if (state.phase === 'TRIAL_DEFENSE') {
      this.showPhaseBanner('¡Un sospechoso en el patíbulo!', '🔔');
      if (window.salemAudio) window.salemAudio.playSuspense();
    } else if (state.phase === 'NIGHT') {
      this.showPhaseBanner(`Cae la Noche ${state.nightNumber}`, '🌙');
      if (window.salemAudio) window.salemAudio.playNight();
      document.body.classList.remove('day-time');
      document.body.classList.add('night-time');
    }
  },

  updatePhaseHeader(state) {
    const iconEl = document.getElementById('phase-icon');
    const titleEl = document.getElementById('phase-title');
    const descEl = document.getElementById('phase-desc');
    const timerNumber = document.getElementById('timer-number');
    const timerBox = document.getElementById('timer-box');

    let icon = '☀️';
    let title = 'Fase Diurna';
    let desc = 'Discutan los acontecimientos con los habitantes.';

    switch (state.phase) {
      case 'ROLE_REVEAL':
        icon = '📜';
        title = 'Revelación de Roles';
        desc = 'Memoriza tu rol, alineación y objetivo secreto.';
        break;
      case 'DAY_DISCUSSION':
        icon = '☀️';
        title = `Día ${state.dayNumber}: Discusión`;
        desc = 'Debatan abiertamente quién parece sospechoso.';
        break;
      case 'DAY_NOMINATION':
        icon = '⚖️';
        title = `Día ${state.dayNumber}: Acusaciones`;
        desc = 'Voten para llevar a un sospechoso al patíbulo.';
        break;
      case 'TRIAL_DEFENSE':
        icon = '🔔';
        title = '¡Juicio en el Patíbulo!';
        desc = 'El acusado tiene la palabra para defenderse.';
        break;
      case 'TRIAL_VOTING':
        icon = '⚖️';
        title = 'Veredicto del Juicio';
        desc = 'Voten Culpable, Inocente o Abstenerse.';
        break;
      case 'TRIAL_VERDICT':
        icon = '🪓';
        title = 'Sentencia del Pueblo';
        desc = 'El pueblo ha decidido la suerte del acusado.';
        break;
      case 'NIGHT':
        icon = '🌙';
        title = `Noche ${state.nightNumber}: Silencio`;
        desc = 'Salem duerme. Usa tus habilidades nocturnas en secreto.';
        break;
      case 'DAWN_REVEAL':
        icon = '🌅';
        title = 'Amanecer en Salem';
        desc = 'Se descubren las bajas de la noche.';
        break;
    }

    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    if (timerNumber) {
      timerNumber.textContent = state.timeLeft || 0;
      if (state.timeLeft <= 10) {
        timerBox?.classList.add('timer-urgent');
      } else {
        timerBox?.classList.remove('timer-urgent');
      }
    }
  },

  renderTownSquare(state, myId) {
    const grid = document.getElementById('citizens-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const myPlayer = state.myPlayer;

    state.players.forEach(p => {
      const isMe = p.id === myId;
      const isAccused = p.id === state.accusedPlayerId;
      const isSelected = this.selectedCitizenId === p.id || this.selectedSecondCitizenId === p.id;

      const card = document.createElement('div');
      card.id = `citizen-card-${p.id}`;
      card.dataset.citizenName = p.name;
      card.className = `citizen-card ${!p.isAlive ? 'dead' : ''} ${isMe ? 'self' : ''} ${isAccused ? 'accused' : ''} ${isSelected ? 'selected-target' : ''}`;

      // Votos de nominación recibidos
      let voteBadge = '';
      if (state.phase === 'DAY_NOMINATION' && state.nominations && state.nominations[p.id]) {
        const count = state.nominations[p.id].reduce((acc, v) => acc + (v.weight || 1), 0);
        if (count > 0) {
          voteBadge = `<div class="vote-count-indicator">${count}</div>`;
        }
      }

      // Estados especiales (Alcalde revelado, encarcelado, muerto)
      let statusIcon = '';
      if (!p.isAlive) {
        statusIcon = '<span class="status-icon-badge">💀</span>';
      } else if (p.isRevealedMayor) {
        statusIcon = '<span class="status-icon-badge" title="Alcalde Revelado">📜</span>';
      }

      // Rol visible (si se conoce)
      let roleBadge = '';
      if (p.visibleRole) {
        const factionColor = p.visibleRole.color || '#2ecc71';
        roleBadge = `<span class="citizen-role-badge" style="background: ${factionColor}33; color: ${factionColor}">${p.visibleRole.name}</span>`;
      } else if (isMe && myPlayer && myPlayer.role) {
        roleBadge = `<span class="citizen-role-badge" style="background: ${myPlayer.role.color}33; color: ${myPlayer.role.color}">${myPlayer.role.name}</span>`;
      } else {
        roleBadge = `<span class="citizen-role-badge" style="background: #34495e33; color: #95a5a6">Habitante</span>`;
      }

      card.innerHTML = `
        ${statusIcon}
        ${voteBadge}
        <div class="citizen-avatar">${!p.isAlive ? '🪦' : p.avatar}</div>
        <div class="citizen-name">${p.name} ${isMe ? '(Tú)' : ''}</div>
        ${roleBadge}
      `;

      // Clic para interactuar
      card.addEventListener('click', () => {
        this.handleCitizenClick(p, state, myPlayer);
      });

      grid.appendChild(card);
    });
  },

  handleCitizenClick(target, state, myPlayer) {
    if (!myPlayer.isAlive) return;

    // 1. Durante acusaciones diurnas: votar para juicio
    if (state.phase === 'DAY_NOMINATION') {
      if (target.isAlive && target.id !== myPlayer.id) {
        SalemApp.nominatePlayer(target.id);
        if (window.salemAudio) window.salemAudio.playClick();
      }
      return;
    }

    // 2. Durante la noche: seleccionar objetivo para habilidad nocturna
    if (state.phase === 'NIGHT') {
      if (!target.isAlive) return;
      if (myPlayer.isJailed) {
        this.showToast('Estás encarcelado y no puedes usar habilidades.', 'error');
        return;
      }

      const role = myPlayer.role;
      if (!role) return;

      if (role.nightActionType === 'TARGET_ONE_NO_SELF' && target.id === myPlayer.id) {
        this.showToast('No puedes seleccionarte a ti mismo.', 'error');
        return;
      }

      // Roles que eligen dos objetivos (ej: Vidente o Bruja)
      if (role.nightActionType === 'TARGET_TWO') {
        if (!this.selectedCitizenId) {
          this.selectedCitizenId = target.id;
          this.showToast(`Primer objetivo: ${target.name}. Elige el segundo objetivo.`);
        } else if (this.selectedCitizenId === target.id) {
          this.selectedCitizenId = null;
        } else {
          this.selectedSecondCitizenId = target.id;
          SalemApp.submitNightAction({
            targetId: this.selectedCitizenId,
            secondTargetId: this.selectedSecondCitizenId
          });
          this.showToast(`Objetivos seleccionados: acción enviada.`);
        }
      } else {
        // Un solo objetivo
        if (this.selectedCitizenId === target.id) {
          this.selectedCitizenId = null;
          SalemApp.submitNightAction({});
          this.showToast('Objetivo cancelado.');
        } else {
          this.selectedCitizenId = target.id;
          SalemApp.submitNightAction({ targetId: target.id });
          this.showToast(`Seleccionaste a ${target.name} como objetivo.`);
        }
      }

      if (window.salemAudio) window.salemAudio.playClick();
      this.renderTownSquare(state, myPlayer.id);
    }
  },

  renderMyRole(myPlayer) {
    if (!myPlayer || !myPlayer.role) return;
    const iconEl = document.getElementById('my-role-icon');
    const nameEl = document.getElementById('my-role-name');
    const factionEl = document.getElementById('my-role-faction');

    if (iconEl) iconEl.textContent = myPlayer.role.icon || '📜';
    if (nameEl) nameEl.textContent = myPlayer.role.name;
    if (factionEl) {
      factionEl.textContent = myPlayer.role.faction;
      factionEl.style.color = myPlayer.role.color || '#2ecc71';
    }
  },

  renderActionDeck(state, myId) {
    const promptBox = document.getElementById('action-prompt-box');
    const buttonsGroup = document.getElementById('action-buttons-group');
    if (!promptBox || !buttonsGroup) return;

    buttonsGroup.innerHTML = '';
    const myPlayer = state.myPlayer;

    if (!myPlayer.isAlive) {
      promptBox.innerHTML = '<span>👻 Has muerto. Puedes hablar con otros fantasmas en el chat de Muertos.</span>';
      return;
    }

    if (state.phase === 'DAY_DISCUSSION' || state.phase === 'DAY_NOMINATION') {
      promptBox.innerHTML = '<span>Haz clic en un habitante para acusarlo o debatir.</span>';

      // Botón del Alcalde para revelarse
      if (myPlayer.role && myPlayer.role.id === 'mayor' && !myPlayer.isRevealedMayor) {
        const mayorBtn = document.createElement('button');
        mayorBtn.className = 'btn btn-gold';
        mayorBtn.innerHTML = '📜 Revelarme como Alcalde';
        mayorBtn.onclick = () => SalemApp.revealMayor();
        buttonsGroup.appendChild(mayorBtn);
      }

      // Habilidad del Carcelero para encarcelar de noche
      if (myPlayer.role && myPlayer.role.id === 'jailor' && this.selectedCitizenId) {
        const jailBtn = document.createElement('button');
        jailBtn.className = 'btn btn-secondary';
        jailBtn.innerHTML = '🗝️ Encarcelar a Seleccionado';
        jailBtn.onclick = () => {
          SalemApp.jailTarget(this.selectedCitizenId);
          this.selectedCitizenId = null;
        };
        buttonsGroup.appendChild(jailBtn);
      }
    } else if (state.phase === 'NIGHT') {
      const role = myPlayer.role;
      promptBox.innerHTML = `<span>${role.actionPrompt || 'Realiza tu acción nocturna:'}</span>`;

      // Veterano en alerta
      if (role.id === 'veteran') {
        const alertBtn = document.createElement('button');
        alertBtn.className = 'btn btn-danger';
        alertBtn.innerHTML = `🎖️ Ponerse en Alerta (${myPlayer.alertsRemaining} restantes)`;
        alertBtn.onclick = () => {
          SalemApp.submitNightAction({ onAlert: true });
          this.showToast('¡Te has puesto en ALERTA máxima para esta noche!');
        };
        buttonsGroup.appendChild(alertBtn);
      }

      // Pirómano prender fuego
      if (role.id === 'arsonist') {
        const igniteBtn = document.createElement('button');
        igniteBtn.className = 'btn btn-danger';
        igniteBtn.innerHTML = '🔥 ¡Prender fuego a empapados!';
        igniteBtn.onclick = () => {
          SalemApp.submitNightAction({ action: 'ignite' });
          this.showToast('¡Has decidido encender las llamas esta noche!');
        };
        buttonsGroup.appendChild(igniteBtn);
      }
    }
  },

  // ==================== PATÍBULO Y JUICIO ====================
  renderTrialStand(state, myId) {
    const stand = document.getElementById('trial-stand-container');
    if (!stand) return;

    if (state.phase !== 'TRIAL_DEFENSE' && state.phase !== 'TRIAL_VOTING' && state.phase !== 'TRIAL_VERDICT') {
      stand.style.display = 'none';
      return;
    }

    stand.style.display = 'flex';
    const accused = state.players.find(p => p.id === state.accusedPlayerId);
    if (!accused) return;

    const nameEl = document.getElementById('trial-accused-name');
    const stageEl = document.getElementById('trial-stage-label');
    const votingBtns = document.getElementById('trial-voting-buttons');

    if (nameEl) nameEl.textContent = accused.name;

    if (state.phase === 'TRIAL_DEFENSE') {
      if (stageEl) stageEl.textContent = 'DEFENSA DEL ACUSADO';
      if (votingBtns) votingBtns.style.display = 'none';
    } else if (state.phase === 'TRIAL_VOTING') {
      if (stageEl) stageEl.textContent = '¡VOTEN SU VEREDICTO!';
      if (votingBtns) {
        const isMeAccused = accused.id === myId;
        const myPlayer = state.myPlayer;

        if (isMeAccused || !myPlayer.isAlive) {
          votingBtns.innerHTML = '<span style="color: var(--text-muted); font-size: 0.95rem;">No puedes votar en tu propio juicio.</span>';
          votingBtns.style.display = 'block';
        } else {
          votingBtns.innerHTML = `
            <button class="btn-trial-guilty" onclick="SalemApp.castTrialVote('GUILTY')">
              🔴 Culpable
            </button>
            <button class="btn-trial-innocent" onclick="SalemApp.castTrialVote('INNOCENT')">
              🟢 Inocente
            </button>
            <button class="btn-trial-abstain" onclick="SalemApp.castTrialVote('ABSTAIN')">
              ⚪ Abstenerse
            </button>
          `;
          votingBtns.style.display = 'flex';
        }
      }
    } else if (state.phase === 'TRIAL_VERDICT') {
      if (stageEl) stageEl.textContent = '⚖️ ¡VEREDICTO EMITIDO!';
      if (votingBtns) votingBtns.style.display = 'none';
    }
  },

  // ==================== BURBUJAS DE CHAT EN VIVO ====================
  showCitizenSpeechBubble(senderName, text) {
    if (!text || text.length === 0) return;
    const cards = document.querySelectorAll('.citizen-card');
    cards.forEach(card => {
      if (card.dataset.citizenName === senderName) {
        // Eliminar burbuja previa si existe
        const oldBubble = card.querySelector('.citizen-speech-bubble');
        if (oldBubble) oldBubble.remove();

        const bubble = document.createElement('div');
        bubble.className = 'citizen-speech-bubble';
        bubble.textContent = text;
        card.appendChild(bubble);

        setTimeout(() => {
          bubble.style.opacity = '0';
          bubble.style.transition = 'opacity 0.3s';
          setTimeout(() => bubble.remove(), 300);
        }, 4000);
      }
    });
  },

  // ==================== CHAT ====================
  appendChatMessage(msg, myId) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${msg.channel.toLowerCase()}`;

    if (msg.channel === 'SYSTEM') {
      msgEl.innerHTML = `<span>${msg.text}</span>`;
    } else {
      msgEl.innerHTML = `<span class="chat-sender">${msg.senderName}:</span><span>${msg.text}</span>`;
      // Mostrar bocadillo animado sobre el personaje si está en la plaza
      const cleanSender = msg.senderName.replace(/^[^\w\s]+/, '').trim();
      this.showCitizenSpeechBubble(cleanSender, msg.text);
    }

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  // ==================== CEMENTERIO Y AMANECER ====================
  renderGraveyard(graveyard) {
    const list = document.getElementById('graveyard-list');
    if (!list) return;
    list.innerHTML = '';

    if (!graveyard || graveyard.length === 0) {
      list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nadie ha muerto todavía en Salem...</p>';
      return;
    }

    graveyard.forEach(dead => {
      const item = document.createElement('div');
      item.className = 'tombstone';
      item.innerHTML = `
        <div class="tombstone-info">
          <div class="tombstone-name">🪦 ${dead.name} - <span style="color: ${dead.color || '#fff'}">${dead.role}</span></div>
          <div class="tombstone-meta">${dead.reason} (${dead.phase})</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="SalemUI.viewWill('${escape(dead.name)}', '${escape(dead.will || '')}')">📜 Testamento</button>
      `;
      list.appendChild(item);
    });
  },

  viewWill(name, willText) {
    const decodedName = unescape(name);
    const decodedWill = unescape(willText);

    const willDisplay = document.getElementById('will-display-text');
    const willTitle = document.getElementById('will-display-title');
    if (willDisplay) willDisplay.textContent = decodedWill || '(No dejó nada escrito en su testamento)';
    if (willTitle) willTitle.textContent = `Testamento de ${decodedName}`;

    this.openModal('modal-view-will');
  },

  renderDawnAnnouncement(dawnData) {
    if (window.salemAudio) window.salemAudio.playBell();

    if (!dawnData.deaths || dawnData.deaths.length === 0) {
      this.showToast('🌅 Amanece en Salem. ¡Nadie murió anoche!', 'success');
      return;
    }

    const container = document.getElementById('dawn-deaths-container');
    if (!container) return;
    container.innerHTML = '';

    dawnData.deaths.forEach(d => {
      const entry = document.createElement('div');
      entry.className = 'death-entry';
      entry.innerHTML = `
        <div class="death-entry-name">
          <span>💀 ${d.name}</span>
          <span style="font-size: 0.85rem; color: #f39c12">${d.role} (${d.faction})</span>
        </div>
        <div class="death-entry-reason">Causa: ${d.reason}</div>
        <div class="parchment-paper" style="padding: 12px; margin-top: 8px;">
          <strong style="font-size: 0.85rem;">Testamento:</strong>
          <pre style="white-space: pre-wrap; font-size: 0.95rem; margin-top: 4px;">${d.will || '(Vacío)'}</pre>
        </div>
      `;
      container.appendChild(entry);
    });

    this.openModal('modal-dawn-announcement');
  },

  renderGameOver(gameOverData) {
    if (window.salemAudio) window.salemAudio.playVictory();

    const titleEl = document.getElementById('victory-title');
    const descEl = document.getElementById('victory-desc');
    const recapTbody = document.getElementById('recap-tbody');

    if (titleEl) titleEl.textContent = gameOverData.title;
    if (descEl) descEl.textContent = gameOverData.message;

    if (recapTbody && gameOverData.recap) {
      recapTbody.innerHTML = '';
      gameOverData.recap.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${p.name}</strong></td>
          <td>${p.roleName} (${p.faction})</td>
          <td>${p.isAlive ? '🟢 Vivo' : '💀 Muerto'}</td>
          <td>${p.hasWon ? '🏆 <strong style="color: var(--gold-accent)">GANADOR</strong>' : '❌ Derrota'}</td>
        `;
        recapTbody.appendChild(row);
      });
    }

    this.openModal('modal-game-over');
  },

  renderRoleGuide(factionFilter = 'ALL') {
    const grid = document.getElementById('role-guide-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const key in CLIENT_ROLES_INFO) {
      const role = CLIENT_ROLES_INFO[key];
      if (factionFilter !== 'ALL' && role.factionKey !== factionFilter) continue;

      const card = document.createElement('div');
      card.className = 'role-guide-card';
      card.innerHTML = `
        <div class="role-guide-card-header">
          <span class="role-guide-icon">${role.icon}</span>
          <span class="role-guide-title" style="color: ${role.color}">${role.name}</span>
        </div>
        <div class="role-guide-summary">${role.summary}</div>
        <div style="font-size: 0.75rem; color: #f1c40f;">🎯 <strong>Objetivo:</strong> ${role.goal}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">💡 ${role.tips}</div>
      `;
      grid.appendChild(card);
    }
  }
};
