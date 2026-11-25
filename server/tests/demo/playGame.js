// Démo manuelle (pas un test Vitest) : lance un vrai serveur avec les modules de test,
// un écran et 2 téléphones simulés, puis joue une partie en affichant chaque événement.
//
//   node server/tests/demo/playGame.js          → partie gagnée (avec 1 erreur)
//   node server/tests/demo/playGame.js lose     → 3 erreurs, partie perdue
import { DEFAULT_RULES, EVENTS } from '@unlockers/shared';
import { TEST_MODULES } from '../fixtures/testModules.js';
import { once, startTestServer } from '../helpers.js';

const lose = process.argv[2] === 'lose';
const log = (who, event, payload) =>
  console.log(`${who.padEnd(7)} ← ${event.padEnd(14)} ${JSON.stringify(payload)}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await startTestServer({
  modules: TEST_MODULES,
  rules: { ...DEFAULT_RULES, durationSeconds: 30 },
  tickMs: 200,
});
const code = server.rooms.create().code;
console.log(`\nServeur de démo sur ${server.url} · salle ${code}\n`);

const screen = await server.client();
const ana = await server.client();
const bob = await server.client();
for (const [who, socket] of Object.entries({ screen, ana, bob })) {
  for (const event of Object.values(EVENTS)) {
    if (event === EVENTS.GAME_TICK) continue; // trop bavard
    socket.on(event, (payload) => log(who, event, payload));
  }
}

screen.emit(EVENTS.SCREEN_JOIN, { code });
await once(screen, EVENTS.LOBBY_UPDATE);
ana.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Ana' });
await once(ana, EVENTS.PLAYER_JOINED);
bob.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Bob' });
await once(bob, EVENTS.PLAYER_JOINED);

console.log('\n── L’écran lance la partie ──');
screen.emit(EVENTS.GAME_START, {});
await pause(100);

const game = server.rooms.get(code).game;
const secret = () => game.moduleById(game.focusedModuleId).state.secret;

console.log('\n── Bob change le focus vers le 3e module ──');
bob.emit(EVENTS.MODULE_FOCUS, { moduleId: game.modules[2].id });
await pause(100);

console.log('\n── Ana tente une mauvaise réponse ──');
ana.emit(EVENTS.MODULE_ACTION, {
  moduleId: game.focusedModuleId,
  action: { type: 'guess', value: (secret() + 1) % 10 },
});
await pause(100);

if (lose) {
  for (let i = 0; i < 2; i += 1) {
    console.log(`\n── Encore une erreur (${i + 2}/3) ──`);
    ana.emit(EVENTS.MODULE_ACTION, {
      moduleId: game.focusedModuleId,
      action: { type: 'guess', value: (secret() + 1) % 10 },
    });
    await pause(100);
  }
} else {
  while (!game.over) {
    console.log(`\n── Ana résout « ${game.focusedModuleId} » ──`);
    ana.emit(EVENTS.MODULE_ACTION, {
      moduleId: game.focusedModuleId,
      action: { type: 'guess', value: secret() },
    });
    await pause(100);
  }
}

console.log(`\nRésultat : ${JSON.stringify(game.over)}\n`);
await server.close();
process.exit(0);
