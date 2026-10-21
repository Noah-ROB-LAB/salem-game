# 🕯️ Salem: Juicio de Brujas (Town of Salem 2 - Web Edition)

Un juego multijugador completo de deducción social, engaño y misterio inspirado fielmente en **Town of Salem 2**, desarrollado en Node.js, WebSockets (Socket.IO) y HTML5/CSS3 gótico responsivo.

---

## 🚀 Cómo jugar con tus amigos desde sus casas

El juego está listo para ejecutarse y jugarse tanto en ordenadores como en teléfonos móviles.

### Paso 1: Iniciar el juego
Abre una terminal en esta carpeta y ejecuta:

```bash
npm start
```

El juego se abrirá en `http://localhost:3000`.

---

### Paso 2: Crear el enlace para que tus amigos entren desde sus casas

Para que tus amigos puedan entrar **desde sus casas por Internet** (sin pagar nada y sin configurar puertos en el router), tienes estas opciones súper sencillas:

#### Opción A: Túnel Público Instantáneo con 1 solo comando (Recomendada)
Ejecuta:
```bash
npm run share
```
o
```bash
npm run tunnel
```
Esto te dará al instante un enlace público seguro (ejemplo: `https://salem-xxx.loca.lt`).
¡Solo tienes que copiar ese enlace y pasárselo a tus amigos por WhatsApp o Discord!

#### Opción B: Cloudflare Tunnel (100% estable y gratis)
Si tienes `cloudflared` instalado:
```bash
cloudflared tunnel --url http://localhost:3000
```
Te dará una URL gratuita `https://xxxx.trycloudflare.com` que tus amigos podrán abrir al instante.

#### Opción C: Desplegarlo 24/7 Gratis en la nube (Render / Railway / Glitch)
Puedes subir esta carpeta a un repositorio de GitHub y conectarlo a [Render.com](https://render.com) como "Web Service" gratuito con comando `npm start`. Tendrás un enlace permanente como `https://mi-salem.onrender.com` disponible las 24 horas.

---

## 🎮 Características del Juego

1. **Creación de Sala con 1 Clic**:
   - Botón "Crear Sala" que genera un código único de 5 letras (ej: `SALEM`).
   - Botón "Copiar Enlace para Amigos" (`http://tudominio/?room=SALEM`) que abre la sala directamente en los navegadores de tus amigos.

2. **Sistema de Bots Inteligentes (IA)**:
   - ¿Sois solo 2 o 3 amigos conectados? ¡No hay problema! El anfitrión puede pulsar **"Añadir Bot"** o **"Rellenar a 6/8 con Bots"**.
   - Los bots hablan en el chat, votan en el patíbulo, se defienden si los acusan y ejecutan sus habilidades nocturnas automáticamente.

3. **Ciclo Completo de Fases**:
   - **Día (Discusión)**: El pueblo debate quién parece sospechoso tras las muertes de la noche.
   - **Acusaciones (Nominación)**: Votación comunitaria para llevar a un sospechoso al patíbulo (requiere mayoría absoluta).
   - **El Patíbulo (Juicio y Defensa)**: El acusado tiene 20 segundos para explicarse ante el pueblo.
   - **Veredicto**: Votaciones en vivo de **Culpable**, **Inocente** o **Abstenerse**. Si es culpable, ¡se ejecuta en la horca y se revela su rol y su testamento!
   - **Noche**: El pueblo duerme. El Aquelarre conspira en su chat privado, el Asesino acecha, el Médico cura, el Sheriff interroga, el Carcelero interroga a su prisionero y el Vigilante carga su revólver.
   - **Amanecer**: La campana de Salem dobla y se revela quién murió, cómo murió y se leen sus testamentos.

4. **El Testamento (Last Will)**:
   - Pergamino interactivo con guardado automático donde cada jugador escribe sus sospechas, investigaciones y coartadas. Al morir, su testamento se muestra a todo el pueblo.

5. **Chat Multicanal con Pestañas**:
   - 🏛️ **Pueblo**: Chat público de día.
   - 🔮 **Aquelarre**: Chat privado y nocturno para las brujas.
   - 🗝️ **Celda**: Chat anónimo e individual entre el Carcelero y su preso.
   - 👻 **Muertos**: Chat para los fantasmas en el más allá.

6. **Efectos de Sonido Nativos (Web Audio API)**:
   - Campana de iglesia gótica, golpe de mazo del juez, disparos, curación celestial y fanfarria de victoria sin necesidad de descargar archivos externos.

---

## 🎭 Roles Incluidos

### 🏛️ Pueblo (Town)
- **Alguacil (Sheriff)**: Investiga a un habitante cada noche para ver si es Sospechoso o Inocente.
- **Médico (Doctor)**: Otorga defensa poderosa a un jugador cada noche. Puede autocurarse 1 vez.
- **Vigilante**: Dispara a un sospechoso con su revólver (3 balas, desde la noche 2). Si dispara a un inocente, no puede volver a disparar.
- **Carcelero (Jailor)**: Encarcela de día a un sospechoso para interrogarlo de noche en privado y puede ejecutarlo.
- **Vidente (Seer)**: Compara a dos personas cada noche para averiguar si son del mismo bando o contrarios.
- **Rastreador (Tracker)**: Sigue a un habitante por la noche y descubre a quién visita.
- **Guardaespaldas (Bodyguard)**: Protege a un habitante. Si su protegido es atacado, mata al atacante y muere con él.
- **Alcalde (Mayor)**: Puede revelarse públicamente de día. Su voto en los juicios vale por 3 votos.
- **Veterano**: Se pone en alerta máxima (3 alertas) y dispara a cualquiera que visite su casa.
- **Investigador**: Descubre si un sospechoso tiene manos ensangrentadas de esa noche.

### 🔮 Aquelarre (Coven)
- **Líder del Aquelarre (Coven Leader)**: Lidera el ataque nocturno mortal del aquelarre. Posee defensa básica.
- **Bruja (Witch)**: Controla mentalmente a un habitante forzándolo a usar su poder contra otra persona.
- **Envenenador (Poisoner)**: Aplica veneno letal que mata la noche siguiente a menos que un médico lo cure.
- **Ilusionista**: Disfraza a un aliado para que parezca inocente ante el Alguacil.

### ⚖️ Neutrales
- **Bufón (Jester)**: ¡Su objetivo es ser colgado en la horca por el pueblo! Si lo cuelgan, gana la partida y mata a uno de los que votaron Culpable.
- **Verdugo (Executioner)**: Debe lograr que su objetivo asignado sea condenado en el patíbulo.
- **Asesino en Serie (Serial Killer)**: Asesina a una víctima cada noche y cuenta con defensa básica nocturna.
- **Pirómano (Arsonist)**: Empapa de gasolina en secreto a jugadores y luego puede encender las llamas para incinerarlos a todos.
