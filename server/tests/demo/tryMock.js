// Démo manuelle (pas un test Vitest) : se branche sur un mock DÉJÀ lancé, comme le feraient
// l'écran de Sara et le téléphone d'Alan, et montre que le mock applique les mêmes règles
// de focus et d'action que le vrai serveur.
//
//   1. MOCK_SCENARIO=lobby npm run mock -w @unlockers/server   (dans un terminal)
//   2. node server/tests/demo/tryMock.js                       (dans un autre)
//
// La partie est jouée dans la salle TEST puis remise au lobby (game:restart) à la fin.
import { io } from 'socket.io-client';
import { EVENTS } from '@unlockers/shared';

const url = process.argv[2] ?? 'http://localhost:3000';
const code = 'TEST';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} label */
async function client(label) {
  const socket = io(url, { transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', () =>
      reject(new Error(`Mock injoignable sur ${url} : lance-le d'abord (npm run mock).`)),
    );
  });
  socket.label = label;
  return socket;
}

/** Attend le prochain `event` (ou null après `ms`). */
const next = (socket, event, ms = 500) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, ms);
    const handler = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });

let step = 0;
/**
 * Envoie un événement depuis un téléphone et affiche la réponse du mock :
 * soit une erreur, soit le nouveau focus.
 */
async function attempt(socket, event, payload, expected) {
  step += 1;
  const error = next(socket, EVENTS.ERROR);
  const view = next(socket, EVENTS.PLAYER_VIEW);
  socket.emit(event, payload);
  const [err, v] = await Promise.all([error, view]);
  const got = err ? `error ${err.code}` : v ? `focus → ${v.focusedModuleId}` : 'aucune réponse';
  const ok = got === expected ? '✅' : '❌';
  console.log(
    `${ok} ${String(step).padStart(2)}. ${socket.label} ${event} ${JSON.stringify(payload)}`,
  );
  console.log(`       attendu : ${expected}  ·  reçu : ${got}`);
}

const screen = await client('Écran');
const ana = await client('Ana');
const bob = await client('Bob');

screen.emit(EVENTS.SCREEN_JOIN, { code });
await next(screen, EVENTS.LOBBY_UPDATE);
for (const [socket, nickname] of [
  [ana, 'Ana'],
  [bob, 'Bob'],
]) {
  const joined = next(socket, EVENTS.PLAYER_JOINED);
  socket.emit(EVENTS.PLAYER_JOIN, { code, nickname });
  const res = await joined;
  if (!res)
    throw new Error(`${nickname} n'a pas pu rejoindre (partie déjà lancée ? relance le mock)`);
  console.log(`${nickname} a rejoint la salle ${code} en ${res.slot}`);
}

const first = next(ana, EVENTS.PLAYER_VIEW);
screen.emit(EVENTS.GAME_START, {});
console.log(`\nPartie lancée · focus de départ : ${(await first)?.focusedModuleId}\n`);

console.log('── Focus ──');
await attempt(ana, EVENTS.MODULE_FOCUS, {}, 'error INVALID_PAYLOAD');
await attempt(ana, EVENTS.MODULE_FOCUS, { moduleId: 'nope' }, 'error INVALID_ACTION');
await attempt(ana, EVENTS.MODULE_FOCUS, { moduleId: 'final' }, 'error MODULE_LOCKED');
await attempt(ana, EVENTS.MODULE_FOCUS, { moduleId: 'keypad' }, 'focus → keypad');
await attempt(bob, EVENTS.MODULE_FOCUS, { moduleId: 'symbols' }, 'error FOCUS_COOLDOWN');
console.log('   … attente de 2 s (délai de focus) …');
await pause(2100);
await attempt(bob, EVENTS.MODULE_FOCUS, { moduleId: 'wires' }, 'focus → wires');

console.log('\n── Actions ──');
await attempt(ana, EVENTS.MODULE_ACTION, { moduleId: 'keypad', action: 'ok' }, 'error NOT_FOCUSED');
await attempt(
  ana,
  EVENTS.MODULE_ACTION,
  { moduleId: 'final', action: 'ok' },
  'error MODULE_LOCKED',
);
await attempt(
  ana,
  EVENTS.MODULE_ACTION,
  { moduleId: 'wires', action: 'boom' },
  'error INVALID_ACTION',
);
await attempt(ana, EVENTS.MODULE_ACTION, { moduleId: 'wires', action: 'solve' }, 'focus → keypad');
await attempt(ana, EVENTS.MODULE_FOCUS, { moduleId: 'wires' }, 'error INVALID_ACTION');

const lobby = next(screen, EVENTS.LOBBY_UPDATE);
screen.emit(EVENTS.GAME_RESTART, {});
await lobby;
console.log('\nSalle TEST remise au lobby (game:restart).');
for (const s of [screen, ana, bob]) s.disconnect();
process.exit(0);
