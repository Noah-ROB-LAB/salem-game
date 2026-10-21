// Motor principal del juego Salem (Town of Salem 2 Web Edition)
const { ROLES, FACTIONS, getRoleDeck } = require('./roles');
const { BotManager, SALEM_BOT_NAMES } = require('./bots');

class SalemGame {
  constructor(roomCode, hostId, hostName, io, options = {}) {
    this.roomCode = roomCode;
    this.io = io;
    this.phase = 'LOBBY'; // LOBBY, ROLE_REVEAL, DAY_DISCUSSION, DAY_NOMINATION, TRIAL_DEFENSE, TRIAL_VOTING, TRIAL_VERDICT, NIGHT, DAWN_REVEAL, GAME_OVER
    this.dayNumber = 0;
    this.nightNumber = 0;
    this.timer = null;
    this.timeLeft = 0;

    this.players = [];
    this.graveyard = []; // Jugadores muertos con sus roles y testamentos revelados
    this.chatLog = [];
    this.botManager = new BotManager(this);

    // Votaciones de nominación
    this.nominations = {}; // { targetId: [voterId, ...] }
    this.accusedPlayerId = null;

    // Votos de juicio
    this.trialVotes = {}; // { voterId: 'GUILTY' | 'INNOCENT' | 'ABSTAIN' }

    // Acciones nocturnas
    this.nightActions = {}; // { actorId: actionData }
    this.covenVote = null; // targetId del voto del aquelarre

    // Configuración de tiempos (en segundos)
    this.timings = {
      roleReveal: 7,
      dayDiscussion: options.dayDiscussion || 35,
      dayNomination: options.dayNomination || 30,
      trialDefense: options.trialDefense || 20,
      trialVoting: options.trialVoting || 15,
      trialVerdict: options.trialVerdict || 9,
      night: options.night || 30,
      dawnReveal: options.dawnReveal || 10
    };

    // Añadir al anfitrión
    this.addPlayer(hostId, hostName, true);
  }

  // ==================== GESTIÓN DE JUGADORES ====================

  addPlayer(id, name, isHost = false, isBot = false, avatar = null) {
    if (this.phase !== 'LOBBY') return null;
    if (this.players.length >= 15) return null;

    const defaultAvatars = ['🧙‍♂️', '🕵️‍♂️', '⚖️', '🗡️', '🎩', '🧕', '👑', '🏹', '📜', '🦹‍♂️'];
    const chosenAvatar = avatar || defaultAvatars[this.players.length % defaultAvatars.length];

    const player = {
      id,
      name: name.trim() || `Habitante #${this.players.length + 1}`,
      avatar: chosenAvatar,
      isHost,
      isBot,
      isAlive: true,
      role: null,
      will: 'Mi testamento:\nSoy un humilde habitante de Salem...',
      deathNote: '',
      isRevealedMayor: false,
      jailedTargetId: null,
      isJailed: false,
      isDoused: false,
      isPoisoned: false,
      poisonedNight: null,
      alertsRemaining: 3,
      ammo: 3,
      executionsRemaining: 3,
      selfHealsUsed: 0,
      guilt: false, // Si un vigilante mata a un inocente
      targetPlayerId: null, // Para el Verdugo
      hasWon: false,
      deathReason: null,
      deathPhase: null
    };

    this.players.push(player);
    this.broadcastLobbyState();
    return player;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return;

    const removed = this.players[index];
    this.players.splice(index, 1);

    // Si era el anfitrión, transferir el rol al primer jugador humano
    if (removed.isHost && this.players.length > 0) {
      const nextHuman = this.players.find(p => !p.isBot);
      if (nextHuman) nextHuman.isHost = true;
      else this.players[0].isHost = true;
    }

    if (this.phase === 'LOBBY') {
      this.broadcastLobbyState();
    } else {
      // Si la partida ya empezó, marcar como desconectado/muerto
      removed.isAlive = false;
      this.checkWinConditions();
      this.broadcastGameState();
    }
  }

  addBot() {
    if (this.phase !== 'LOBBY' || this.players.length >= 15) return false;
    const usedNames = this.players.map(p => p.name);
    const availableNames = SALEM_BOT_NAMES.filter(n => !usedNames.includes(n));
    const botName = availableNames.length > 0 ? availableNames[0] : `Bot ${this.players.length + 1}`;
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.addPlayer(botId, botName, false, true);
    return true;
  }

  fillWithBots(targetCount = 6) {
    while (this.players.length < targetCount && this.players.length < 15) {
      if (!this.addBot()) break;
    }
  }

  removeBot(botId) {
    if (this.phase !== 'LOBBY') return;
    this.removePlayer(botId);
  }

  // ==================== INICIO DE PARTIDA ====================

  startGame() {
    if (this.players.length < 4) {
      return { success: false, message: 'Se necesitan al menos 4 jugadores para iniciar la partida.' };
    }

    this.phase = 'ROLE_REVEAL';
    this.dayNumber = 1;
    this.nightNumber = 0;
    this.graveyard = [];
    this.chatLog = [];

    // Asignar roles equilibrados
    const deck = getRoleDeck(this.players.length);
    this.players.forEach((player, idx) => {
      const roleId = deck[idx];
      player.role = { ...ROLES[roleId] };
      player.isAlive = true;
      player.alertsRemaining = player.role.startingAlerts || 3;
      player.ammo = player.role.startingAmmo || 3;
      player.executionsRemaining = player.role.startingExecutions || 3;
      player.selfHealsUsed = 0;
      player.isRevealedMayor = false;
      player.isJailed = false;
      player.isDoused = false;
      player.isPoisoned = false;
      player.guilt = false;
      player.deathReason = null;
      player.deathPhase = null;
      player.hasWon = false;

      // Si es Verdugo, asignarle un objetivo inocente del Pueblo
      if (player.role.id === 'executioner') {
        const townies = this.players.filter(p => p.id !== player.id && ROLES[deck[this.players.indexOf(p)]].faction === 'TOWN' && ROLES[deck[this.players.indexOf(p)]].id !== 'mayor' && ROLES[deck[this.players.indexOf(p)]].id !== 'jailor');
        if (townies.length > 0) {
          player.targetPlayerId = townies[Math.floor(Math.random() * townies.length)].id;
        }
      }
    });

    this.broadcastGameState();

    // Temporizador de revelación de roles
    this.startPhaseTimer(this.timings.roleReveal, () => {
      this.transitionToDayDiscussion();
    });

    return { success: true };
  }

  // ==================== FASES DEL DÍA ====================

  transitionToDayDiscussion() {
    this.phase = 'DAY_DISCUSSION';
    this.nominations = {};
    this.accusedPlayerId = null;
    this.trialVotes = {};

    this.broadcastSystemMessage(`☀️ ¡Amanece el Día ${this.dayNumber} en Salem! El pueblo se reúne en la plaza.`);
    this.broadcastGameState();

    this.botManager.handleDayDiscussion();

    this.startPhaseTimer(this.timings.dayDiscussion, () => {
      this.transitionToDayNomination();
    });
  }

  transitionToDayNomination() {
    this.phase = 'DAY_NOMINATION';
    this.nominations = {};
    const aliveCount = this.players.filter(p => p.isAlive).length;
    const votesNeeded = Math.floor(aliveCount / 2) + 1;

    this.broadcastSystemMessage(`⚖️ ¡Comienza la fase de acusaciones! Se necesitan ${votesNeeded} votos para llevar a alguien a juicio.`);
    this.broadcastGameState();

    this.botManager.handleNomination();

    this.startPhaseTimer(this.timings.dayNomination, () => {
      // Si nadie fue enviado a juicio al expirar el tiempo, pasar a la noche
      this.broadcastSystemMessage('⏳ El pueblo no logró ponerse de acuerdo. Cae el anochecer...');
      this.transitionToNight();
    });
  }

  handleVote(voterId, targetId) {
    if (this.phase !== 'DAY_NOMINATION') return;
    const voter = this.players.find(p => p.id === voterId);
    if (!voter || !voter.isAlive) return;

    const target = this.players.find(p => p.id === targetId);
    if (!target || !target.isAlive) return;

    // Calcular peso del voto (el Alcalde revelado vota x3)
    const voteWeight = voter.isRevealedMayor ? 3 : 1;

    // Si ya votaba al mismo, retirar voto
    if (this.nominations[targetId] && this.nominations[targetId].some(v => v.id === voterId)) {
      this.nominations[targetId] = this.nominations[targetId].filter(v => v.id !== voterId);
      this.broadcastSystemMessage(`🗳️ ${voter.name} ha retirado su acusación contra ${target.name}.`);
    } else {
      // Quitar voto previo de otros candidatos
      for (const tId in this.nominations) {
        this.nominations[tId] = this.nominations[tId].filter(v => v.id !== voterId);
      }
      if (!this.nominations[targetId]) {
        this.nominations[targetId] = [];
      }
      this.nominations[targetId].push({ id: voterId, name: voter.name, weight: voteWeight });
      this.broadcastSystemMessage(`👉 ${voter.name} acusa a ${target.name} (${this.getVotesCount(targetId)} votos).`);
    }

    this.broadcastGameState();

    // Comprobar si se alcanza la mayoría requerida
    const aliveCount = this.players.filter(p => p.isAlive).length;
    const needed = Math.floor(aliveCount / 2) + 1;

    if (this.getVotesCount(targetId) >= needed) {
      this.clearPhaseTimer();
      this.transitionToTrialDefense(target);
    }
  }

  getVotesCount(targetId) {
    if (!this.nominations[targetId]) return 0;
    return this.nominations[targetId].reduce((acc, v) => acc + (v.weight || 1), 0);
  }

  // ==================== FASES DEL JUICIO (TRIAL) ====================

  transitionToTrialDefense(accused) {
    this.phase = 'TRIAL_DEFENSE';
    this.accusedPlayerId = accused.id;
    this.trialVotes = {};

    this.broadcastSystemMessage(`🔔 ¡${accused.name} ha sido llevado al patíbulo! Tiene ${this.timings.trialDefense} segundos para defenderse.`);
    this.broadcastGameState();

    this.botManager.handleDefense(accused);

    this.startPhaseTimer(this.timings.trialDefense, () => {
      this.transitionToTrialVoting(accused);
    });
  }

  transitionToTrialVoting(accused) {
    this.phase = 'TRIAL_VOTING';
    this.trialVotes = {};

    this.broadcastSystemMessage(`⚖️ ¡Es hora de dictar veredicto para ${accused.name}! Voten CULPABLE, INOCENTE o ABSTENERSE.`);
    this.broadcastGameState();

    this.botManager.handleTrialVerdict(accused);

    this.startPhaseTimer(this.timings.trialVoting, () => {
      this.transitionToTrialVerdict(accused);
    });
  }

  handleTrialVote(voterId, verdict) {
    if (this.phase !== 'TRIAL_VOTING') return;
    const voter = this.players.find(p => p.id === voterId);
    if (!voter || !voter.isAlive || voter.id === this.accusedPlayerId) return;

    if (!['GUILTY', 'INNOCENT', 'ABSTAIN'].includes(verdict)) return;

    this.trialVotes[voterId] = {
      verdict,
      weight: voter.isRevealedMayor ? 3 : 1
    };

    this.broadcastGameState();
  }

  transitionToTrialVerdict(accused) {
    this.phase = 'TRIAL_VERDICT';

    let guiltyPoints = 0;
    let innocentPoints = 0;
    const votersSummary = [];

    for (const vId in this.trialVotes) {
      const voteData = this.trialVotes[vId];
      const p = this.players.find(pl => pl.id === vId);
      if (!p) continue;

      if (voteData.verdict === 'GUILTY') guiltyPoints += voteData.weight;
      if (voteData.verdict === 'INNOCENT') innocentPoints += voteData.weight;

      votersSummary.push({
        name: p.name,
        verdict: voteData.verdict,
        weight: voteData.weight
      });
    }

    const isGuilty = guiltyPoints > innocentPoints && guiltyPoints > 0;

    let verdictMsg = `⚖️ Veredicto final: ${guiltyPoints} Culpable vs ${innocentPoints} Inocente. `;
    if (isGuilty) {
      verdictMsg += `¡${accused.name} ha sido condenado a la horca!`;
    } else {
      verdictMsg += `¡${accused.name} ha sido declarado INOCENTE y regresa con el pueblo!`;
    }

    this.broadcastSystemMessage(verdictMsg);

    const verdictPayload = {
      accusedName: accused.name,
      accusedRole: accused.role.name,
      accusedFaction: accused.role.faction,
      accusedWill: accused.will,
      isGuilty,
      guiltyPoints,
      innocentPoints,
      votersSummary
    };

    if (isGuilty) {
      accused.isAlive = false;
      accused.deathReason = 'Ejecutado en la horca por el pueblo';
      accused.deathPhase = `Día ${this.dayNumber}`;

      this.graveyard.unshift({
        name: accused.name,
        role: accused.role.name,
        faction: accused.role.faction,
        color: accused.role.color,
        reason: accused.deathReason,
        phase: accused.deathPhase,
        will: accused.will
      });

      // Si el colgado era el Bufón (Jester), ¡gana la partida!
      if (accused.role.id === 'jester') {
        accused.hasWon = true;
        this.broadcastSystemMessage(`🤡 ¡${accused.name} era el BUFÓN! ¡Ha ganado la partida al ser ejecutado por el pueblo!`);
      }

      // Si el colgado era el objetivo del Verdugo (Executioner)
      const executioners = this.players.filter(p => p.role && p.role.id === 'executioner' && p.targetPlayerId === accused.id && p.isAlive);
      executioners.forEach(exe => {
        exe.hasWon = true;
        this.broadcastSystemMessage(`🪓 ¡${exe.name} ha cumplido su objetivo de colgar a su víctima y gana la partida!`);
      });
    }

    this.io.to(this.roomCode).emit('trial_result', verdictPayload);
    this.broadcastGameState();

    this.startPhaseTimer(this.timings.trialVerdict, () => {
      const winner = this.checkWinConditions();
      if (winner) {
        this.endGame(winner);
      } else {
        this.transitionToNight();
      }
    });
  }

  // Habilidad diurna del Alcalde: Revelarse públicamente
  revealMayor(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.isAlive || player.role.id !== 'mayor' || player.isRevealedMayor) return;

    player.isRevealedMayor = true;
    this.broadcastSystemMessage(`📜 ¡ATENCIÓN PUEBLO! ${player.name} ha revelado oficialmente su título como ALCALDE DE SALEM. Sus votos valdrán por 3.`);
    this.broadcastGameState();
  }

  // Habilidad diurna del Carcelero: Elegir prisionero
  jailPlayer(jailorId, targetId) {
    if (this.phase !== 'DAY_DISCUSSION' && this.phase !== 'DAY_NOMINATION') return;
    const jailor = this.players.find(p => p.id === jailorId);
    if (!jailor || !jailor.isAlive || jailor.role.id !== 'jailor') return;

    const target = this.players.find(p => p.id === targetId);
    if (!target || !target.isAlive || target.id === jailorId) return;

    jailor.jailedTargetId = target.id;
    this.sendPrivateNotification(jailorId, `🗝️ Has seleccionado encarcelar a ${target.name} esta noche.`);
    this.sendPrivateNotification(targetId, `🗝️ Un Carcelero vendrá a encerrarte en la celda esta noche para interrogarte.`);
  }

  // ==================== FASE NOCTURNA (NIGHT) ====================

  transitionToNight() {
    this.phase = 'NIGHT';
    this.nightNumber += 1;
    this.nightActions = {};
    this.covenVote = null;

    // Resetear estados temporales de noche
    this.players.forEach(p => {
      p.isJailed = false;
      if (p.role && p.role.id === 'jailor' && p.jailedTargetId) {
        const prisoner = this.players.find(t => t.id === p.jailedTargetId);
        if (prisoner && prisoner.isAlive) {
          prisoner.isJailed = true;
        } else {
          p.jailedTargetId = null;
        }
      }
    });

    this.broadcastSystemMessage(`🌙 Cae la Noche ${this.nightNumber} sobre Salem. Cierren puertas y ventanas.`);
    this.broadcastGameState();

    this.botManager.handleNightActions();

    this.startPhaseTimer(this.timings.night, () => {
      this.resolveNightActions();
    });
  }

  setNightAction(actorId, actionData) {
    if (this.phase !== 'NIGHT') return;
    const actor = this.players.find(p => p.id === actorId);
    if (!actor || !actor.isAlive) return;

    // Si está encarcelado, no puede realizar acciones nocturnas
    if (actor.isJailed) {
      this.sendPrivateNotification(actorId, '⛓️ Estás en la celda del Carcelero y no puedes realizar tu acción esta noche.');
      return;
    }

    this.nightActions[actorId] = actionData;
    this.sendPrivateNotification(actorId, '✅ Acción nocturna registrada.');
  }

  // Chat de la celda de la cárcel
  sendJailChat(senderId, text) {
    if (this.phase !== 'NIGHT') return;
    const sender = this.players.find(p => p.id === senderId);
    if (!sender) return;

    const jailor = this.players.find(p => p.role && p.role.id === 'jailor' && p.isAlive && p.jailedTargetId);
    if (!jailor) return;

    const prisoner = this.players.find(p => p.id === jailor.jailedTargetId && p.isAlive);
    if (!prisoner) return;

    if (senderId !== jailor.id && senderId !== prisoner.id) return;

    const isJailorSender = senderId === jailor.id;
    const senderDisplayName = isJailorSender ? '🗝️ El Carcelero (Anónimo)' : `⛓️ ${prisoner.name}`;

    const msg = {
      senderId,
      senderName: senderDisplayName,
      text,
      channel: 'JAIL',
      timestamp: Date.now()
    };

    this.io.to(jailor.id).emit('chat_message', msg);
    this.io.to(prisoner.id).emit('chat_message', msg);
  }

  // ==================== RESOLUCIÓN DE LA NOCHE ====================

  resolveNightActions() {
    this.phase = 'DAWN_REVEAL';
    const deathsThisNight = [];
    const feedback = {}; // { playerId: [messages] }
    const addMsg = (pId, msg) => {
      if (!feedback[pId]) feedback[pId] = [];
      feedback[pId].push(msg);
    };

    const alivePlayers = this.players.filter(p => p.isAlive);

    // 1. Carcelero decide ejecutar
    const jailor = this.players.find(p => p.role && p.role.id === 'jailor' && p.isAlive);
    if (jailor && jailor.jailedTargetId) {
      const prisoner = this.players.find(p => p.id === jailor.jailedTargetId);
      const jailAction = this.nightActions[jailor.id];
      if (prisoner && jailAction && jailAction.execute && jailor.executionsRemaining > 0) {
        jailor.executionsRemaining -= 1;
        deathsThisNight.push({
          victim: prisoner,
          reason: 'Ejecutado en prisión por el Carcelero',
          killer: jailor
        });
        addMsg(prisoner.id, '⚔️ El Carcelero decidió ejecutar tu sentencia en la celda.');
        addMsg(jailor.id, `⚔️ Ejecutaste a ${prisoner.name} en la celda.`);

        if (prisoner.role.faction === 'TOWN') {
          jailor.executionsRemaining = 0;
          addMsg(jailor.id, '💔 ¡Has ejecutado a un inocente del Pueblo! La culpa te impedirá volver a ejecutar.');
        }
      }
    }

    // 2. Control mental de la Bruja (Witch)
    const witch = this.players.find(p => p.role && p.role.id === 'witch' && p.isAlive && !p.isJailed);
    if (witch && this.nightActions[witch.id]) {
      const { targetId, secondTargetId } = this.nightActions[witch.id];
      const puppet = this.players.find(p => p.id === targetId && p.isAlive && !p.isJailed);
      if (puppet && secondTargetId) {
        // Redirigir la acción del controlado
        this.nightActions[puppet.id] = { targetId: secondTargetId };
        addMsg(puppet.id, '🔮 Una fuerza oscura e invisible ha controlado tu mente esta noche hacia otro objetivo.');
        addMsg(witch.id, `🧙‍♀️ Controlaste a ${puppet.name} (Rol: ${puppet.role.name}) hacia su nuevo objetivo.`);
      }
    }

    // 3. Envenenador (Poisoner) y bloqueos
    const poisoner = this.players.find(p => p.role && p.role.id === 'poisoner' && p.isAlive && !p.isJailed);
    if (poisoner && this.nightActions[poisoner.id]) {
      const target = this.players.find(p => p.id === this.nightActions[poisoner.id].targetId && p.isAlive);
      if (target && !target.isJailed) {
        target.isPoisoned = true;
        target.poisonedNight = this.nightNumber;
        addMsg(target.id, '🧪 Sientes un ardor amargo en tu garganta... ¡has sido envenenado y morirás mañana a menos que te curen!');
        addMsg(poisoner.id, `🧪 Envenenaste con éxito a ${target.name}.`);
      }
    }

    // 4. Veterano en alerta
    const veteransOnAlert = new Set();
    this.players.filter(p => p.role && p.role.id === 'veteran' && p.isAlive).forEach(vet => {
      const action = this.nightActions[vet.id];
      if (action && action.onAlert && vet.alertsRemaining > 0) {
        vet.alertsRemaining -= 1;
        veteransOnAlert.add(vet.id);
        addMsg(vet.id, '🎖️ Estuviste en ALERTA máxima con tu rifle preparado.');
      }
    });

    // 5. Curaciones de Médicos
    const healedTargets = new Set();
    this.players.filter(p => p.role && p.role.id === 'doctor' && p.isAlive && !p.isJailed).forEach(doc => {
      const action = this.nightActions[doc.id];
      if (action && action.targetId) {
        const target = this.players.find(p => p.id === action.targetId && p.isAlive);
        if (target) {
          // Si se cura a sí mismo, verificar límite
          if (target.id === doc.id) {
            if (doc.selfHealsUsed < (doc.role.maxSelfHeals || 1)) {
              doc.selfHealsUsed += 1;
              healedTargets.add(target.id);
              addMsg(doc.id, '💉 Te has aplicado un antídoto y suturas protectoras a ti mismo.');
            } else {
              addMsg(doc.id, '❌ No te quedan más autocuraciones disponibles.');
            }
          } else {
            healedTargets.add(target.id);
            addMsg(doc.id, `💉 Has cuidado y protegido a ${target.name} con tu botiquín médico.`);
          }
        }
      }
    });

    // Curación cura el veneno
    healedTargets.forEach(targetId => {
      const p = this.players.find(pl => pl.id === targetId);
      if (p && p.isPoisoned) {
        p.isPoisoned = false;
        addMsg(p.id, '✨ Un médico ha neutralizado el veneno letal en tu cuerpo.');
      }
    });

    // 6. Guardaespaldas (Bodyguard)
    const guardedTargets = new Map(); // targetId -> bodyguardPlayer
    this.players.filter(p => p.role && p.role.id === 'bodyguard' && p.isAlive && !p.isJailed).forEach(bg => {
      const action = this.nightActions[bg.id];
      if (action && action.targetId && action.targetId !== bg.id) {
        guardedTargets.set(action.targetId, bg);
        addMsg(bg.id, `🛡️ Vigilaste de cerca la casa de tu protegido.`);
      }
    });

    // 7. Ataques: Aquelarre, Asesino en Serie, Vigilante
    const attacks = []; // [{ attacker, target, attackPower, reason }]

    // Ataque del Aquelarre (Coven Leader o Coven Kill)
    const covenLeader = this.players.find(p => p.role && p.role.id === 'coven_leader' && p.isAlive && !p.isJailed);
    if (covenLeader && this.nightActions[covenLeader.id]) {
      const target = this.players.find(p => p.id === this.nightActions[covenLeader.id].targetId && p.isAlive);
      if (target && !target.isJailed) {
        attacks.push({
          attacker: covenLeader,
          target,
          attackPower: 2, // Poderoso
          reason: 'Asesinado por las artes oscuras del Aquelarre'
        });
      }
    }

    // Ataque del Asesino en Serie (Serial Killer)
    const serialKiller = this.players.find(p => p.role && p.role.id === 'serial_killer' && p.isAlive && !p.isJailed);
    if (serialKiller && this.nightActions[serialKiller.id]) {
      const target = this.players.find(p => p.id === this.nightActions[serialKiller.id].targetId && p.isAlive);
      if (target && !target.isJailed) {
        attacks.push({
          attacker: serialKiller,
          target,
          attackPower: 1, // Básico
          reason: 'Apuñalado brutalmente por un Asesino en Serie'
        });
      }
    }

    // Ataque del Vigilante
    this.players.filter(p => p.role && p.role.id === 'vigilante' && p.isAlive && !p.isJailed).forEach(vig => {
      if (this.nightNumber > 1 && vig.ammo > 0 && !vig.guilt) {
        const action = this.nightActions[vig.id];
        if (action && action.targetId) {
          const target = this.players.find(p => p.id === action.targetId && p.isAlive);
          if (target && !target.isJailed) {
            vig.ammo -= 1;
            attacks.push({
              attacker: vig,
              target,
              attackPower: 1,
              reason: 'Disparado por un Vigilante'
            });

            if (target.role.faction === 'TOWN') {
              vig.guilt = true;
              addMsg(vig.id, '💔 ¡Le has disparado a un inocente del Pueblo! La culpa te consumirá.');
            }
          }
        }
      }
    });

    // Veterano disparando a visitantes
    for (const actorId in this.nightActions) {
      const action = this.nightActions[actorId];
      if (action && action.targetId && veteransOnAlert.has(action.targetId)) {
        const visitor = this.players.find(p => p.id === actorId);
        const vet = this.players.find(p => p.id === action.targetId);
        if (visitor && visitor.isAlive && vet) {
          deathsThisNight.push({
            victim: visitor,
            reason: 'Disparado al entrar en la casa de un Veterano en alerta',
            killer: vet
          });
          addMsg(visitor.id, '💥 ¡Entraste en la casa de un Veterano que estaba en alerta máxima!');
          addMsg(vet.id, `💥 ¡Disparaste a alguien que intentó entrar en tu casa!`);
        }
      }
    }

    // Pirómano (Arsonist) - Empapar o prender fuego
    const arsonist = this.players.find(p => p.role && p.role.id === 'arsonist' && p.isAlive && !p.isJailed);
    if (arsonist && this.nightActions[arsonist.id]) {
      const arsoAction = this.nightActions[arsonist.id];
      if (arsoAction.action === 'ignite') {
        // Quemar a todos los empapados
        this.players.filter(p => p.isAlive && p.isDoused).forEach(victim => {
          deathsThisNight.push({
            victim,
            reason: 'Calcinado en un infierno de fuego provocado por el Pirómano',
            killer: arsonist
          });
          addMsg(victim.id, '🔥 ¡Las llamas te envolvieron por completo!');
        });
        addMsg(arsonist.id, '🔥 ¡Encendiste las cerillas y prendiste fuego a tus víctimas!');
      } else if (arsoAction.targetId) {
        const target = this.players.find(p => p.id === arsoAction.targetId && p.isAlive);
        if (target && !target.isJailed) {
          target.isDoused = true;
          addMsg(arsonist.id, `⛽ Empapaste en secreto de gasolina a ${target.name}.`);
        }
      }
    }

    // Resolver ataques directos
    attacks.forEach(att => {
      const { attacker, target, attackPower, reason } = att;
      if (!target.isAlive) return;

      // Si el objetivo está protegido por un Guardaespaldas
      if (guardedTargets.has(target.id)) {
        const bg = guardedTargets.get(target.id);
        deathsThisNight.push({
          victim: bg,
          reason: 'Murió valientemente defendiendo a su protegido de un ataque',
          killer: attacker
        });
        deathsThisNight.push({
          victim: attacker,
          reason: 'Asesinado en duelo singular por un Guardaespaldas defensor',
          killer: bg
        });
        addMsg(target.id, '🛡️ ¡Fuiste atacado anoche, pero un Guardaespaldas dio su vida por salvarte!');
        addMsg(bg.id, `⚔️ Luchaste a muerte contra el atacante de tu protegido.`);
        addMsg(attacker.id, `⚔️ Fuiste repelido y asesinado por un leal Guardaespaldas.`);
        return;
      }

      // Si el objetivo fue curado por un Médico
      if (healedTargets.has(target.id)) {
        addMsg(target.id, '❤️ ¡Fuiste atacado anoche, pero un Médico sanó tus heridas mortales!');
        addMsg(attacker.id, '🛡️ Tu objetivo fue protegido por un médico y sobrevivió.');
        return;
      }

      // Si el objetivo tiene defensa intrínseca mayor o igual al ataque
      const targetDefense = (target.role.defense || 0);
      if (targetDefense >= attackPower) {
        addMsg(target.id, '🛡️ Fuiste atacado en la noche, pero tu defensa resistió el golpe.');
        addMsg(attacker.id, '🛡️ Tu objetivo tenía una defensa impenetrable y sobrevivió.');
        return;
      }

      // Ataque exitoso
      deathsThisNight.push({
        victim: target,
        reason,
        killer: attacker
      });
      addMsg(target.id, `💀 Has muerto: ${reason}`);
      addMsg(attacker.id, `🎯 Lograste eliminar a ${target.name}.`);
    });

    // 8. Investigaciones e información
    // Alguacil (Sheriff)
    this.players.filter(p => p.role && p.role.id === 'sheriff' && p.isAlive && !p.isJailed).forEach(sh => {
      const action = this.nightActions[sh.id];
      if (action && action.targetId) {
        const target = this.players.find(p => p.id === action.targetId && p.isAlive);
        if (target) {
          const isSus = target.role.faction === 'COVEN' || target.role.id === 'serial_killer';
          if (isSus) {
            addMsg(sh.id, `🔍 Tu investigación revela que ${target.name} es ¡SOSPECHOSO! ⚠️`);
          } else {
            addMsg(sh.id, `🔍 Tu investigación revela que ${target.name} parece Inocente.`);
          }
        }
      }
    });

    // Vidente (Seer)
    this.players.filter(p => p.role && p.role.id === 'seer' && p.isAlive && !p.isJailed).forEach(sr => {
      const action = this.nightActions[sr.id];
      if (action && action.targetId && action.secondTargetId) {
        const t1 = this.players.find(p => p.id === action.targetId && p.isAlive);
        const t2 = this.players.find(p => p.id === action.secondTargetId && p.isAlive);
        if (t1 && t2) {
          const same = t1.role.faction === t2.role.faction;
          if (same) {
            addMsg(sr.id, `🔮 Las almas de ${t1.name} y ${t2.name} son AMIGAS (Pertenecen al mismo bando).`);
          } else {
            addMsg(sr.id, `🔮 Las almas de ${t1.name} y ${t2.name} son ENEMIGAS (Pertenecen a bandos contrarios).`);
          }
        }
      }
    });

    // Rastreador (Tracker)
    this.players.filter(p => p.role && p.role.id === 'tracker' && p.isAlive && !p.isJailed).forEach(tr => {
      const action = this.nightActions[tr.id];
      if (action && action.targetId) {
        const target = this.players.find(p => p.id === action.targetId && p.isAlive);
        if (target) {
          const targetAction = this.nightActions[target.id];
          if (targetAction && targetAction.targetId) {
            const visited = this.players.find(p => p.id === targetAction.targetId);
            addMsg(tr.id, `👣 Viste a ${target.name} salir de su casa y visitar a ${visited ? visited.name : 'alguien'}.`);
          } else {
            addMsg(tr.id, `👣 ${target.name} no salió de su casa esta noche.`);
          }
        }
      }
    });

    // Investigador
    this.players.filter(p => p.role && p.role.id === 'investigator' && p.isAlive && !p.isJailed).forEach(inv => {
      const action = this.nightActions[inv.id];
      if (action && action.targetId) {
        const target = this.players.find(p => p.id === action.targetId && p.isAlive);
        if (target) {
          const didAttack = attacks.some(a => a.attacker.id === target.id);
          if (didAttack) {
            addMsg(inv.id, `🔍 ¡Encontraste sangre fresca y signos de violencia en la ropa de ${target.name}!`);
          } else {
            addMsg(inv.id, `🔍 No encontraste pruebas incriminatorias en la casa de ${target.name}.`);
          }
        }
      }
    });

    // Aplicar defunciones sin duplicar
    const finalDead = [];
    deathsThisNight.forEach(d => {
      if (d.victim.isAlive) {
        d.victim.isAlive = false;
        d.victim.deathReason = d.reason;
        d.victim.deathPhase = `Noche ${this.nightNumber}`;
        finalDead.push(d);

        this.graveyard.unshift({
          name: d.victim.name,
          role: d.victim.role.name,
          faction: d.victim.role.faction,
          color: d.victim.role.color,
          reason: d.victim.deathReason,
          phase: d.victim.deathPhase,
          will: d.victim.will,
          deathNote: d.killer && d.killer.deathNote ? d.killer.deathNote : ''
        });
      }
    });

    // Enviar mensajes privados de retroalimentación
    for (const pId in feedback) {
      feedback[pId].forEach(msg => this.sendPrivateNotification(pId, msg));
    }

    // Emitir eventos de amanecer
    const dawnPayload = {
      nightNumber: this.nightNumber,
      deaths: finalDead.map(d => ({
        name: d.victim.name,
        role: d.victim.role.name,
        faction: d.victim.role.faction,
        reason: d.reason,
        will: d.victim.will,
        deathNote: d.killer && d.killer.deathNote ? d.killer.deathNote : ''
      }))
    };

    this.io.to(this.roomCode).emit('dawn_announcement', dawnPayload);
    this.broadcastGameState();

    // Esperar a que se lean los testamentos del amanecer antes de iniciar el siguiente día
    const delay = finalDead.length > 0 ? this.timings.dawnReveal : 4;
    this.startPhaseTimer(delay, () => {
      const winner = this.checkWinConditions();
      if (winner) {
        this.endGame(winner);
      } else {
        this.dayNumber += 1;
        this.transitionToDayDiscussion();
      }
    });
  }

  // ==================== CONDICIONES DE VICTORIA ====================

  checkWinConditions() {
    const alivePlayers = this.players.filter(p => p.isAlive);
    const aliveTown = alivePlayers.filter(p => p.role.faction === 'TOWN');
    const aliveCoven = alivePlayers.filter(p => p.role.faction === 'COVEN');
    const aliveSK = alivePlayers.filter(p => p.role.id === 'serial_killer');
    const aliveArsonist = alivePlayers.filter(p => p.role.id === 'arsonist');

    // 1. Nadie sobrevive
    if (alivePlayers.length === 0) {
      return { winner: 'DRAW', message: '¡Todos han muerto en Salem! Nadie sobrevivió al juicio de brujas.' };
    }

    // 2. Solo Pueblo vivo y sin asesinos
    if (aliveCoven.length === 0 && aliveSK.length === 0 && aliveArsonist.length === 0 && aliveTown.length > 0) {
      return {
        winner: 'TOWN',
        title: '¡VICTORIA DEL PUEBLO!',
        message: 'El Pueblo ha purgado a todos los criminales y al Aquelarre. La paz reina de nuevo en Salem.'
      };
    }

    // 3. El Aquelarre tiene mayoría o eliminó al pueblo y neutrales
    if (aliveCoven.length > 0 && aliveSK.length === 0 && aliveArsonist.length === 0 && aliveCoven.length >= aliveTown.length) {
      return {
        winner: 'COVEN',
        title: '¡VICTORIA DEL AQUELARRE!',
        message: 'Las brujas del Aquelarre han superado en número a los ciudadanos. Salem cae bajo la oscuridad eterna.'
      };
    }

    // 4. Asesino en Serie gana si eliminó a todos los demás
    if (aliveSK.length > 0 && aliveCoven.length === 0 && aliveTown.length <= 1 && aliveArsonist.length === 0) {
      return {
        winner: 'SERIAL_KILLER',
        title: '¡VICTORIA DEL ASESINO EN SERIE!',
        message: 'El Asesino en Serie ha masacrado a todo el pueblo. Sus cuchillos reclaman la ciudad.'
      };
    }

    // 5. Pirómano gana
    if (aliveArsonist.length > 0 && aliveCoven.length === 0 && aliveSK.length === 0 && aliveTown.length <= 1) {
      return {
        winner: 'ARSONIST',
        title: '¡VICTORIA DEL PIRÓMANO!',
        message: 'Salem arde en cenizas bajo el fuego purificador del Pirómano.'
      };
    }

    return null;
  }

  endGame(winnerData) {
    this.phase = 'GAME_OVER';
    this.clearPhaseTimer();

    const recap = this.players.map(p => ({
      name: p.name,
      roleName: p.role.name,
      faction: p.role.faction,
      isAlive: p.isAlive,
      hasWon: p.hasWon || (winnerData.winner === p.role.faction) || (winnerData.winner === 'TOWN' && p.role.faction === 'TOWN') || (winnerData.winner === 'COVEN' && p.role.faction === 'COVEN')
    }));

    const finalPayload = {
      winner: winnerData.winner,
      title: winnerData.title,
      message: winnerData.message,
      recap
    };

    this.io.to(this.roomCode).emit('game_over', finalPayload);
    this.broadcastGameState();
  }

  // ==================== CHAT Y COMUNICACIÓN ====================

  handleChatMessage(senderId, text, channel = 'TOWN') {
    const sender = this.players.find(p => p.id === senderId);
    if (!sender) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    // Control de canales de chat:
    // 1. Canal MUERTOS (DEAD): Jugadores muertos pueden hablar en cualquier fase
    if (!sender.isAlive || channel === 'DEAD') {
      const msg = {
        senderId: sender.id,
        senderName: `👻 ${sender.name} (Muerto)`,
        text: trimmed,
        channel: 'DEAD',
        timestamp: Date.now()
      };
      // Enviar solo a jugadores muertos
      this.players.filter(p => !p.isAlive).forEach(p => {
        this.io.to(p.id).emit('chat_message', msg);
      });
      return;
    }

    // 2. Jugadores vivos no pueden hablar en chat general durante la noche ni en juicio ajeno
    if (this.phase === 'NIGHT') {
      // Aquelarre puede hablar entre sí
      if (sender.role.faction === 'COVEN' || channel === 'COVEN') {
        const msg = {
          senderId: sender.id,
          senderName: `🔮 ${sender.name} (${sender.role.name})`,
          text: trimmed,
          channel: 'COVEN',
          timestamp: Date.now()
        };
        this.players.filter(p => p.role && p.role.faction === 'COVEN').forEach(p => {
          this.io.to(p.id).emit('chat_message', msg);
        });
        return;
      }
      return; // Los ciudadanos duermen de noche
    }

    // En juicio (defensa), solo el acusado puede hablar libremente
    if (this.phase === 'TRIAL_DEFENSE' && sender.id !== this.accusedPlayerId) {
      this.sendPrivateNotification(sender.id, '🤫 Silencio en la sala: Solo el acusado en el patíbulo puede hablar ahora.');
      return;
    }

    // Chat público del pueblo
    this.broadcastChat({
      senderId: sender.id,
      senderName: sender.isRevealedMayor ? `📜 ${sender.name} [Alcalde]` : sender.name,
      text: trimmed,
      channel: 'TOWN',
      isDead: false
    });
  }

  broadcastChat(msg) {
    this.chatLog.push(msg);
    this.io.to(this.roomCode).emit('chat_message', msg);
  }

  broadcastSystemMessage(text) {
    const msg = {
      senderId: 'SYSTEM',
      senderName: 'Salem',
      text,
      channel: 'SYSTEM',
      timestamp: Date.now()
    };
    this.chatLog.push(msg);
    this.io.to(this.roomCode).emit('chat_message', msg);
  }

  sendPrivateNotification(playerId, text) {
    this.io.to(playerId).emit('private_message', {
      text,
      timestamp: Date.now()
    });
  }

  // Actualizar testamento (Last Will)
  updateWill(playerId, willText) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.will = willText;
    }
  }

  // Actualizar nota de muerte
  updateDeathNote(playerId, deathNoteText) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.deathNote = deathNoteText;
    }
  }

  // ==================== TEMPORIZADORES Y ESTADO ====================

  startPhaseTimer(seconds, onExpire) {
    this.clearPhaseTimer();
    this.timeLeft = seconds;

    this.timer = setInterval(() => {
      this.timeLeft -= 1;
      this.io.to(this.roomCode).emit('timer_tick', { timeLeft: this.timeLeft, phase: this.phase });

      if (this.timeLeft <= 0) {
        this.clearPhaseTimer();
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
    }, 1000);
  }

  clearPhaseTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  broadcastLobbyState() {
    this.io.to(this.roomCode).emit('lobby_state', {
      roomCode: this.roomCode,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isBot: p.isBot
      }))
    });
  }

  broadcastGameState() {
    // Generar estado seguro para cada jugador (ocultando roles secretos ajenos)
    this.players.forEach(recipient => {
      const isRecipientCoven = recipient.role && recipient.role.faction === 'COVEN';

      const sanitizedPlayers = this.players.map(p => {
        let visibleRole = null;
        let visibleFaction = null;

        // Reglas de revelación:
        // 1. Uno mismo siempre ve su propio rol
        if (p.id === recipient.id) {
          visibleRole = p.role;
          visibleFaction = p.role ? p.role.faction : null;
        }
        // 2. Alcalde revelado públicamente
        else if (p.isRevealedMayor) {
          visibleRole = p.role;
          visibleFaction = 'TOWN';
        }
        // 3. Jugador muerto: su rol se hace público a todos
        else if (!p.isAlive && p.role) {
          visibleRole = p.role;
          visibleFaction = p.role.faction;
        }
        // 4. Los miembros del Aquelarre se conocen entre sí
        else if (isRecipientCoven && p.role && p.role.faction === 'COVEN') {
          visibleRole = p.role;
          visibleFaction = 'COVEN';
        }

        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isAlive: p.isAlive,
          isHost: p.isHost,
          isBot: p.isBot,
          isRevealedMayor: p.isRevealedMayor,
          visibleRole,
          visibleFaction,
          isAccused: p.id === this.accusedPlayerId
        };
      });

      this.io.to(recipient.id).emit('game_state', {
        phase: this.phase,
        dayNumber: this.dayNumber,
        nightNumber: this.nightNumber,
        timeLeft: this.timeLeft,
        players: sanitizedPlayers,
        myPlayer: recipient,
        graveyard: this.graveyard,
        accusedPlayerId: this.accusedPlayerId,
        nominations: this.nominations,
        trialVotes: this.trialVotes
      });
    });
  }
}

module.exports = SalemGame;
