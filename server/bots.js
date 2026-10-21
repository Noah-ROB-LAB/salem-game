// Módulo de Inteligencia Artificial para Bots (Jugadores controlados por la máquina)
// Permite jugar partidas completas incluso si son pocos amigos (ej: 2-4 personas + bots)

const SALEM_BOT_NAMES = [
  'Giles Corey',
  'John Proctor',
  'Abigail Williams',
  'Samuel Parris',
  'Mary Eastey',
  'Thomas Danforth',
  'Ann Putnam',
  'Martha Corey',
  'Cotton Mather',
  'William Phips',
  'Sarah Good',
  'Edward Bishop',
  'Dorcas Hoar',
  'Arthur Miller',
  'Bridget Bishop'
];

const CHAT_PHRASES = {
  day_greeting: [
    'Buenos días a todos. Que Dios proteja hoy a Salem.',
    'Menuda noche tan siniestra...',
    '¿Alguien tiene información útil para compartir?',
    'Espero que el Alguacil haya encontrado algo anoche.',
    'Por favor, que nadie empiece a votar a lo loco sin pruebas.'
  ],
  day_discussion: [
    'Tened cuidado con los que están callados.',
    'Yo soy del Pueblo, no tengo nada que temer.',
    '¿Hay algún sospechoso claro según las investigaciones?',
    'No podemos permitir que el Aquelarre nos sobrepase en número.',
    'Votemos solo con pruebas certeras, no condenemos a inocentes.'
  ],
  on_accused: [
    '¡No soy culpable! ¡Estáis cometiendo un grave error!',
    '¡Soy inocente del Pueblo! ¡Si me colgáis, le daréis la victoria al Aquelarre!',
    '¡Mirad mi testamento! He estado ayudando a Salem desde el inicio.',
    '¡Esto es una trampa de los criminales para desviar la atención!'
  ],
  after_lynch_guilty: [
    'Salem respira un poco más tranquila hoy.',
    'Se hizo justicia en el patíbulo.',
    'Un malvado menos en nuestra ciudad.'
  ],
  after_lynch_innocent: [
    'Madre mía... acabamos de colgar a un inocente.',
    'El pueblo ha cometido un gravísimo error...',
    'Esto beneficia a los asesinos...'
  ]
};

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

class BotManager {
  constructor(game) {
    this.game = game;
  }

  // Comportamiento del bot durante el día (discusión y charla)
  handleDayDiscussion() {
    const bots = this.game.players.filter(p => p.isBot && p.isAlive);
    if (bots.length === 0) return;

    // Un bot al azar puede hablar en el chat
    const speakingBot = getRandomItem(bots);
    const delay = 3000 + Math.random() * 6000;

    setTimeout(() => {
      if (this.game.phase !== 'DAY_DISCUSSION' && this.game.phase !== 'DAY_NOMINATION') return;
      if (!speakingBot.isAlive) return;

      const message = getRandomItem(CHAT_PHRASES.day_discussion);
      this.game.broadcastChat({
        senderId: speakingBot.id,
        senderName: speakingBot.name,
        text: message,
        channel: 'TOWN',
        isDead: false
      });
    }, delay);
  }

  // Comportamiento del bot para votar en la fase de nominación (enviar a juicio)
  handleNomination() {
    const bots = this.game.players.filter(p => p.isBot && p.isAlive);
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    if (alivePlayers.length < 2) return;

    bots.forEach(bot => {
      // 40% de probabilidad de nominar a alguien
      if (Math.random() < 0.4) {
        const delay = 4000 + Math.random() * 8000;
        setTimeout(() => {
          if (this.game.phase !== 'DAY_NOMINATION') return;
          if (!bot.isAlive) return;

          // Seleccionar a alguien que no sea él mismo (y si es Coven, no a compañeros)
          const validTargets = alivePlayers.filter(p => {
            if (p.id === bot.id) return false;
            if (bot.role.faction === 'COVEN' && p.role.faction === 'COVEN') return false;
            return true;
          });

          if (validTargets.length > 0) {
            const target = getRandomItem(validTargets);
            this.game.handleVote(bot.id, target.id);
          }
        }, delay);
      }
    });
  }

  // Comportamiento cuando el bot es puesto en el patíbulo (defensa)
  handleDefense(accusedPlayer) {
    if (!accusedPlayer.isBot) return;

    setTimeout(() => {
      if (this.game.phase !== 'TRIAL_DEFENSE') return;
      const plea = getRandomItem(CHAT_PHRASES.on_accused);
      this.game.broadcastChat({
        senderId: accusedPlayer.id,
        senderName: accusedPlayer.name,
        text: plea,
        channel: 'TOWN',
        isDead: false
      });
    }, 2500);
  }

  // Comportamiento del bot en el veredicto del juicio (Culpable / Inocente / Abstenerse)
  handleTrialVerdict(accusedPlayer) {
    const bots = this.game.players.filter(p => p.isBot && p.isAlive && p.id !== accusedPlayer.id);

    bots.forEach(bot => {
      const delay = 2000 + Math.random() * 5000;
      setTimeout(() => {
        if (this.game.phase !== 'TRIAL_VOTING') return;
        if (!bot.isAlive) return;

        let verdict = 'ABSTAIN';

        // Si es Bufón, le encanta votar culpable para generar caos
        if (bot.role.id === 'jester') {
          verdict = Math.random() < 0.7 ? 'GUILTY' : 'INNOCENT';
        }
        // Si el acusado es del mismo bando (Aquelarre), siempre votan Inocente
        else if (bot.role.faction === 'COVEN' && accusedPlayer.role.faction === 'COVEN') {
          verdict = 'INNOCENT';
        }
        // Si es Verdugo y el acusado es su objetivo, ¡siempre vota Culpable!
        else if (bot.role.id === 'executioner' && bot.targetPlayerId === accusedPlayer.id) {
          verdict = 'GUILTY';
        }
        // Pueblo o Neutrales deciden según azar ponderado
        else {
          const rand = Math.random();
          if (rand < 0.45) verdict = 'GUILTY';
          else if (rand < 0.75) verdict = 'INNOCENT';
          else verdict = 'ABSTAIN';
        }

        this.game.handleTrialVote(bot.id, verdict);
      }, delay);
    });
  }

  // Acciones nocturnas automatizadas para bots
  handleNightActions() {
    const bots = this.game.players.filter(p => p.isBot && p.isAlive);
    const alivePlayers = this.game.players.filter(p => p.isAlive);

    bots.forEach(bot => {
      const delay = 2000 + Math.random() * 6000;
      setTimeout(() => {
        if (this.game.phase !== 'NIGHT') return;
        if (!bot.isAlive) return;

        this.executeBotNightAction(bot, alivePlayers);
      }, delay);
    });
  }

  executeBotNightAction(bot, alivePlayers) {
    const roleId = bot.role.id;
    const others = alivePlayers.filter(p => p.id !== bot.id);
    if (others.length === 0) return;

    switch (roleId) {
      case 'sheriff': {
        const target = getRandomItem(others);
        this.game.setNightAction(bot.id, { targetId: target.id });
        break;
      }
      case 'doctor': {
        // 80% cura a otros, 20% se cura a sí mismo si aún tiene carga
        if (Math.random() < 0.2 && bot.selfHealsUsed < (bot.role.maxSelfHeals || 1)) {
          this.game.setNightAction(bot.id, { targetId: bot.id });
        } else {
          const target = getRandomItem(others);
          this.game.setNightAction(bot.id, { targetId: target.id });
        }
        break;
      }
      case 'vigilante': {
        if (this.game.nightNumber > 1 && bot.ammo > 0 && !bot.guilt) {
          // Solo dispara con cierta prudencia (35% de probabilidad)
          if (Math.random() < 0.35) {
            const target = getRandomItem(others);
            this.game.setNightAction(bot.id, { targetId: target.id });
          }
        }
        break;
      }
      case 'bodyguard': {
        const target = getRandomItem(others);
        this.game.setNightAction(bot.id, { targetId: target.id });
        break;
      }
      case 'seer': {
        if (others.length >= 2) {
          const shuffled = [...others].sort(() => Math.random() - 0.5);
          this.game.setNightAction(bot.id, {
            targetId: shuffled[0].id,
            secondTargetId: shuffled[1].id
          });
        }
        break;
      }
      case 'tracker': {
        const target = getRandomItem(others);
        this.game.setNightAction(bot.id, { targetId: target.id });
        break;
      }
      case 'veteran': {
        if (bot.alertsRemaining > 0 && Math.random() < 0.3) {
          this.game.setNightAction(bot.id, { onAlert: true });
        }
        break;
      }
      case 'coven_leader': {
        // Mata a alguien que no sea del Aquelarre
        const nonCoven = alivePlayers.filter(p => p.role.faction !== 'COVEN');
        if (nonCoven.length > 0) {
          const target = getRandomItem(nonCoven);
          this.game.setNightAction(bot.id, { targetId: target.id });
        }
        break;
      }
      case 'serial_killer': {
        const target = getRandomItem(others);
        this.game.setNightAction(bot.id, { targetId: target.id });
        break;
      }
      case 'poisoner': {
        const nonCoven = alivePlayers.filter(p => p.role.faction !== 'COVEN');
        if (nonCoven.length > 0) {
          const target = getRandomItem(nonCoven);
          this.game.setNightAction(bot.id, { targetId: target.id });
        }
        break;
      }
      case 'arsonist': {
        // Empapa a alguien o enciende si ya empapó a varios
        const unDoused = others.filter(p => !p.isDoused);
        if (unDoused.length > 0 && Math.random() < 0.75) {
          const target = getRandomItem(unDoused);
          this.game.setNightAction(bot.id, { targetId: target.id, action: 'douse' });
        } else {
          this.game.setNightAction(bot.id, { action: 'ignite' });
        }
        break;
      }
      default:
        break;
    }
  }
}

module.exports = {
  SALEM_BOT_NAMES,
  BotManager
};
