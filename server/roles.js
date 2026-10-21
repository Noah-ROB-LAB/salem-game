// Definición completa de Roles inspirados en Town of Salem 2
// Facciones: PUEBLO (Town), AQUELARRE (Coven), NEUTRAL (Neutral)

const FACTIONS = {
  TOWN: {
    id: 'TOWN',
    name: 'Pueblo',
    color: '#2ecc71',
    goal: 'Elimina a todos los criminales y miembros del Aquelarre que amenazan la paz de Salem.'
  },
  COVEN: {
    id: 'COVEN',
    name: 'Aquelarre',
    color: '#9b59b6',
    goal: 'Elimina a todos los que se opongan al Aquelarre hasta dominar Salem.'
  },
  NEUTRAL: {
    id: 'NEUTRAL',
    name: 'Neutral',
    color: '#95a5a6',
    goal: 'Cumple tu objetivo personal e individual.'
  }
};

const ROLES = {
  // ==================== PUEBLO (TOWN) ====================
  sheriff: {
    id: 'sheriff',
    name: 'Alguacil (Sheriff)',
    faction: 'TOWN',
    alignment: 'Investigación',
    icon: '⭐',
    color: '#2ecc71',
    defense: 0,
    attack: 0,
    nightActionType: 'TARGET_ONE',
    actionPrompt: 'Elige a un jugador para interrogar esta noche:',
    description: 'El guardián de la ley que investiga a los habitantes en busca de maldad.',
    abilities: [
      'Interroga a un jugador cada noche para averiguar si es sospechoso.'
    ],
    attributes: [
      'Descubrirás si tu objetivo es "Sospechoso" (Aquelarre o Asesino en Serie) o "Inocente".',
      'Ciertos roles astutos pueden aparecer como inocentes.'
    ]
  },

  doctor: {
    id: 'doctor',
    name: 'Médico (Doctor)',
    faction: 'TOWN',
    alignment: 'Protección',
    icon: '💉',
    color: '#2ecc71',
    defense: 0,
    attack: 0,
    nightActionType: 'SELF_OR_OTHER',
    maxSelfHeals: 1,
    actionPrompt: 'Elige a un habitante para curar y proteger esta noche:',
    description: 'Un sabio cirujano que sana a los heridos en la oscuridad.',
    abilities: [
      'Cura a un habitante cada noche otorgándole Defensa Poderosa.',
      'Solo puedes autocurarte 1 vez por partida.'
    ],
    attributes: [
      'Sabrás si tu objetivo fue atacado y lo salvaste de la muerte.',
      'No puedes curar al Alcalde si ya se ha revelado.'
    ]
  },

  vigilante: {
    id: 'vigilante',
    name: 'Vigilante',
    faction: 'TOWN',
    alignment: 'Asesinato',
    icon: '🔫',
    color: '#2ecc71',
    defense: 0,
    attack: 1, // Basic attack
    nightActionType: 'TARGET_ONE',
    startingAmmo: 3,
    canShootNight1: false,
    actionPrompt: 'Elige a un sospechoso para dispararle esta noche:',
    description: 'Un justiciero armado dispuesto a tomar la ley en sus propias manos.',
    abilities: [
      'Dispara a un jugador por la noche con tu revólver (comienzas con 3 balas).',
      'No puedes disparar la primera noche (Noche 1).'
    ],
    attributes: [
      '¡Cuidado! Si disparas a un inocente miembro del Pueblo, la culpa te consumirá y no podrás volver a disparar.'
    ]
  },

  bodyguard: {
    id: 'bodyguard',
    name: 'Guardaespaldas',
    faction: 'TOWN',
    alignment: 'Protección',
    icon: '🛡️',
    color: '#2ecc71',
    defense: 0,
    attack: 2, // Powerful counter attack
    nightActionType: 'TARGET_ONE_NO_SELF',
    actionPrompt: 'Elige a quién vas a proteger con tu vida:',
    description: 'Un valiente defensor mercenario leal a la causa del pueblo.',
    abilities: [
      'Protege a un habitante cada noche de un ataque mortal.'
    ],
    attributes: [
      'Si tu objetivo es atacado, tú y el atacante morirán en combate singular.',
      'Tu contraataque atraviesa defensas básicas.'
    ]
  },

  jailor: {
    id: 'jailor',
    name: 'Carcelero (Jailor)',
    faction: 'TOWN',
    alignment: 'Poder',
    icon: '🗝️',
    color: '#27ae60',
    defense: 0,
    attack: 3, // Unstoppable execution
    dayActionType: 'JAIL_TARGET',
    startingExecutions: 3,
    actionPrompt: 'Elige a un jugador para encerrarlo en prisión esta noche:',
    description: 'Un juez y carcelero supremo que encierra sospechosos para interrogarlos en privado.',
    abilities: [
      'Durante el día, puedes seleccionar a un sospechoso para encarcelarlo la noche siguiente.',
      'En la noche, hablas de forma 100% anónima con el prisionero en una celda privada.',
      'Puedes decidir EJECUTAR al prisionero (tienes 3 ejecuciones).'
    ],
    attributes: [
      'El prisionero no puede realizar su habilidad nocturna ni ser atacado en la celda.',
      'Si ejecutas a un miembro inocente del Pueblo, no podrás volver a ejecutar.'
    ]
  },

  seer: {
    id: 'seer',
    name: 'Vidente (Seer)',
    faction: 'TOWN',
    alignment: 'Investigación',
    icon: '🔮',
    color: '#2ecc71',
    defense: 0,
    attack: 0,
    nightActionType: 'TARGET_TWO',
    actionPrompt: 'Elige dos jugadores para comparar sus almas:',
    description: 'Una mística que percibe las conexiones espirituales entre los ciudadanos.',
    abilities: [
      'Elige a dos jugadores cada noche para analizar su alineación.'
    ],
    attributes: [
      'Averiguarás si ambos jugadores son "Amigos" (misma facción) o "Enemigos" (distinta facción).'
    ]
  },

  tracker: {
    id: 'tracker',
    name: 'Rastreador (Tracker)',
    faction: 'TOWN',
    alignment: 'Investigación',
    icon: '👣',
    color: '#2ecc71',
    defense: 0,
    attack: 0,
    nightActionType: 'TARGET_ONE_NO_SELF',
    actionPrompt: 'Elige a un habitante para seguir sus pasos esta noche:',
    description: 'Un cazador que rastrea los movimientos nocturnos de sus vecinos.',
    abilities: [
      'Sigue a un jugador cada noche y descubre a quién visita.'
    ],
    attributes: [
      'Si tu objetivo no sale de su casa, sabrás que se quedó en su hogar.'
    ]
  },

  veteran: {
    id: 'veteran',
    name: 'Veterano',
    faction: 'TOWN',
    alignment: 'Asesinato',
    icon: '🎖️',
    color: '#2ecc71',
    defense: 1, // Basic defense when on alert
    attack: 2, // Powerful attack
    nightActionType: 'ALERT_TOGGLE',
    startingAlerts: 3,
    actionPrompt: '¿Deseas ponerte en ALERTA máxima esta noche?',
    description: 'Un veterano de guerra paranoico que no duda en disparar ante el menor ruido.',
    abilities: [
      'Puedes ponerte en ALERTA durante la noche (tienes 3 alertas).'
    ],
    attributes: [
      'Mientras estés en alerta, obtienes Defensa Básica y DISPARAS A CUALQUIERA que visite tu casa, sea amigo o enemigo.',
      'Eres inmune a los bloqueos de rol mientras estás en alerta.'
    ]
  },

  mayor: {
    id: 'mayor',
    name: 'Alcalde (Mayor)',
    faction: 'TOWN',
    alignment: 'Poder',
    icon: '📜',
    color: '#2ecc71',
    defense: 0,
    attack: 0,
    nightActionType: 'NONE',
    dayActionType: 'REVEAL_MAYOR',
    description: 'El líder político de Salem cuya palabra tiene un peso decisivo en el tribunal.',
    abilities: [
      'Puedes revelarte públicamente como Alcalde en cualquier momento del día.'
    ],
    attributes: [
      'Una vez revelado, tu voto en el juicio cuenta por TRES (3) votos.',
      'Los médicos no pueden curarte una vez revelado por seguridad del pueblo.'
    ]
  },

  investigator: {
    id: 'investigator',
    name: 'Investigador',
    faction: 'TOWN',
    alignment: 'Investigación',
    icon: '🔍',
    color: '#2ecc71',
    defense: 0,
    attack: 0,
    nightActionType: 'TARGET_ONE_NO_SELF',
    actionPrompt: 'Elige a un habitante para registrar su casa:',
    description: 'Un detective metódico que busca pistas incriminatorias en la escena.',
    abilities: [
      'Investiga a un jugador para saber si cometió un asesinato o tiene sangre en sus manos esta noche.'
    ],
    attributes: [
      'Descubrirás si tu objetivo tiene "Manos ensangrentadas" (atacó esta noche) o "Manos limpias".'
    ]
  },

  // ==================== AQUELARRE (COVEN) ====================
  coven_leader: {
    id: 'coven_leader',
    name: 'Líder del Aquelarre (Coven Leader)',
    faction: 'COVEN',
    alignment: 'Poder',
    icon: '👑',
    color: '#9b59b6',
    defense: 1, // Basic defense
    attack: 2, // Powerful attack
    nightActionType: 'COVEN_KILL',
    actionPrompt: 'Elige a la víctima que el Aquelarre sacrificará esta noche:',
    description: 'La bruja suprema que comanda las fuerzas oscuras del aquelarre.',
    abilities: [
      'Ordena y ejecuta el ataque nocturno del Aquelarre contra una víctima elegida.',
      'Habla en el aquelarre privado durante la noche con tus hermanas brujas.'
    ],
    attributes: [
      'Posees Defensa Básica.',
      'Tu ataque es Poderoso.'
    ]
  },

  witch: {
    id: 'witch',
    name: 'Bruja (Witch)',
    faction: 'COVEN',
    alignment: 'Engaño',
    icon: '🧙‍♀️',
    color: '#9b59b6',
    defense: 0,
    attack: 0,
    nightActionType: 'TARGET_TWO',
    actionPrompt: 'Elige a quién controlar y hacia quién dirigir su poder:',
    description: 'Una hechicera capaz de manipular la voluntad de sus víctimas.',
    abilities: [
      'Controla la mente de un jugador cada noche para forzarlo a usar su habilidad sobre un segundo jugador.'
    ],
    attributes: [
      'Descubres el rol exacto del jugador que controlas.',
      'Tu víctima sabrá que fue controlada por una fuerza oscura.'
    ]
  },

  poisoner: {
    id: 'poisoner',
    name: 'Envenenador (Poisoner)',
    faction: 'COVEN',
    alignment: 'Engaño',
    icon: '🧪',
    color: '#9b59b6',
    defense: 0,
    attack: 1,
    nightActionType: 'TARGET_ONE_NO_SELF',
    actionPrompt: 'Elige a quién suministrar veneno esta noche:',
    description: 'Un maestro de toxinas mortales y hierbas alucinógenas.',
    abilities: [
      'Aplica un veneno letal a un habitante y bloquea su habilidad esa noche.'
    ],
    attributes: [
      'El veneno surtirá efecto mortal la noche siguiente, a menos que un Médico lo cure a tiempo.'
    ]
  },

  illusionist: {
    id: 'illusionist',
    name: 'Ilusionista (Illusionist)',
    faction: 'COVEN',
    alignment: 'Engaño',
    icon: '🎭',
    color: '#9b59b6',
    defense: 0,
    attack: 0,
    nightActionType: 'TARGET_ONE',
    actionPrompt: 'Elige a un aliado del Aquelarre para ocultar su aura:',
    description: 'Un tejedor de ilusiones que camufla a sus aliados ante los ojos de la ley.',
    abilities: [
      'Aplica una ilusión a un miembro del Aquelarre (o a ti mismo) cada noche.'
    ],
    attributes: [
      'El objetivo ilusionado parecerá totalmente "Inocente" ante los interrogatorios del Alguacil e Investigadores.'
    ]
  },

  // ==================== NEUTRALES (NEUTRALS) ====================
  jester: {
    id: 'jester',
    name: 'Bufón (Jester)',
    faction: 'NEUTRAL',
    alignment: 'Caos',
    icon: '🤡',
    color: '#e67e22',
    defense: 0,
    attack: 3, // Haunt after death is unstoppable
    nightActionType: 'NONE',
    description: 'Un loco demente cuya única obsesión es ser ejecutado en el patíbulo público.',
    abilities: [
      '¡Convence al pueblo de que eres culpable para que te cuelguen en la horca durante el día!'
    ],
    attributes: [
      'Si el pueblo te condena a la horca, ¡GANSAS LA PARTIDA INMEDIATAMENTE!',
      'Esa misma noche como fantasma, atormentas y matas con ataque imparable a uno de los que votaron "Culpable" por ti.'
    ]
  },

  executioner: {
    id: 'executioner',
    name: 'Verdugo (Executioner)',
    faction: 'NEUTRAL',
    alignment: 'Maligno',
    icon: '🪓',
    color: '#7f8c8d',
    defense: 1, // Basic defense
    attack: 0,
    nightActionType: 'NONE',
    description: 'Un fanático con una venganza personal contra un inocente miembro del pueblo.',
    abilities: [
      'Al comenzar la partida se te asigna un habitante del Pueblo como tu "Objetivo Secreto".'
    ],
    attributes: [
      'Tu objetivo es conseguir que tu víctima sea colgada en el patíbulo.',
      'Si tu objetivo es ejecutado en el juicio, ¡GANSAS LA PARTIDA!',
      'Si tu objetivo muere de noche por otro asesino, tu odio te transforma en un Bufón.'
    ]
  },

  serial_killer: {
    id: 'serial_killer',
    name: 'Asesino en Serie (Serial Killer)',
    faction: 'NEUTRAL',
    alignment: 'Asesinato',
    icon: '🔪',
    color: '#c0392b',
    defense: 1, // Basic defense
    attack: 1, // Basic attack
    nightActionType: 'TARGET_ONE_NO_SELF',
    actionPrompt: 'Elige a tu próxima víctima para apuñalar esta noche:',
    description: 'Un maníaco sediento de sangre que caza en solitario en la noche de Salem.',
    abilities: [
      'Apuñala a una víctima cada noche con tu cuchillo.'
    ],
    attributes: [
      'Posees Defensa Básica permanente por la noche.',
      'Si eres encarcelado por el Carcelero y éste no te ejecuta, ¡lo apuñalas y lo matas a él!',
      'Ganas si eliminas a todos los demás habitantes de Salem.'
    ]
  },

  arsonist: {
    id: 'arsonist',
    name: 'Pirómano (Arsonist)',
    faction: 'NEUTRAL',
    alignment: 'Asesinato',
    icon: '🔥',
    color: '#d35400',
    defense: 1, // Basic defense
    attack: 3, // Unstoppable fire
    nightActionType: 'IGNITE_OR_DOUSE',
    actionPrompt: 'Elige a quién empapar de gasolina o enciende las llamas:',
    description: 'Un pirómano obsesionado con ver arder a toda la ciudad en un holocausto de fuego.',
    abilities: [
      'Empapa a un jugador de gasolina en secreto por la noche.',
      'O bien, puedes elegir ENCENDER LAS LLAMAS para quemar y matar al instante a todos los jugadores que hayas empapado previamente.'
    ],
    attributes: [
      'Posees Defensa Básica.',
      'Las llamas causan daño imparable que ignora la protección de los médicos.'
    ]
  }
};

// Generador de listas de roles equilibradas según el número de jugadores
function getRoleDeck(playerCount, customPool = null) {
  if (customPool && Array.isArray(customPool) && customPool.length >= playerCount) {
    // Mezclar el pool personalizado
    const shuffled = [...customPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, playerCount);
  }

  // Barajas estándar probadas y divertidas según el número de jugadores:
  const presets = {
    4: ['sheriff', 'doctor', 'coven_leader', 'jester'],
    5: ['sheriff', 'doctor', 'vigilante', 'coven_leader', 'jester'],
    6: ['sheriff', 'doctor', 'vigilante', 'seer', 'coven_leader', 'serial_killer'],
    7: ['sheriff', 'doctor', 'vigilante', 'bodyguard', 'coven_leader', 'witch', 'jester'],
    8: ['sheriff', 'doctor', 'vigilante', 'jailor', 'seer', 'coven_leader', 'witch', 'serial_killer'],
    9: ['sheriff', 'doctor', 'vigilante', 'jailor', 'tracker', 'coven_leader', 'poisoner', 'jester', 'serial_killer'],
    10: ['sheriff', 'doctor', 'vigilante', 'jailor', 'mayor', 'bodyguard', 'coven_leader', 'witch', 'jester', 'serial_killer'],
    11: ['sheriff', 'doctor', 'vigilante', 'jailor', 'seer', 'veteran', 'bodyguard', 'coven_leader', 'witch', 'illusionist', 'jester'],
    12: ['sheriff', 'doctor', 'vigilante', 'jailor', 'seer', 'tracker', 'bodyguard', 'veteran', 'coven_leader', 'witch', 'poisoner', 'serial_killer'],
    13: ['sheriff', 'doctor', 'vigilante', 'jailor', 'seer', 'tracker', 'bodyguard', 'mayor', 'coven_leader', 'witch', 'poisoner', 'jester', 'serial_killer'],
    14: ['sheriff', 'doctor', 'vigilante', 'jailor', 'seer', 'tracker', 'bodyguard', 'mayor', 'veteran', 'coven_leader', 'witch', 'poisoner', 'jester', 'executioner'],
    15: ['sheriff', 'doctor', 'vigilante', 'jailor', 'seer', 'tracker', 'bodyguard', 'mayor', 'veteran', 'investigator', 'coven_leader', 'witch', 'poisoner', 'jester', 'serial_killer']
  };

  const count = Math.max(4, Math.min(15, playerCount));
  const list = presets[count] ? [...presets[count]] : presets[8];

  // Mezclar aleatoriamente para asignar
  return list.sort(() => Math.random() - 0.5);
}

module.exports = {
  ROLES,
  FACTIONS,
  getRoleDeck
};
