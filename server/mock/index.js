// @ts-check
/**
 * Lance le mock-server à la place du vrai serveur (`npm run dev:mock` à la racine).
 *
 * Variables d'environnement (toutes optionnelles) :
 *   MOCK_SCENARIO   victory (défaut) | lobby | defeat-errors | defeat-time | focus | disconnect
 *   MOCK_BOTS       nombre de faux joueurs dans le lobby (défaut 2)
 *   MOCK_AUTOSTART  1 pour lancer la partie seule après l'arrivée des bots
 *   MOCK_SPEED      accélération du temps (défaut 1)
 *   PORT, PUBLIC_URL comme le vrai serveur
 *
 * L'écran peut aussi choisir le scénario à la connexion : io({ query: { scenario: 'focus' } }).
 */
import { createMockServer, TEST_ROOM_CODE } from './mockServer.js';
import { DEFAULT_SCENARIO, SCENARIOS } from './scenarios.js';

const port = Number(process.env.PORT ?? 3000);
const scenario = process.env.MOCK_SCENARIO ?? DEFAULT_SCENARIO;

const mock = createMockServer({
  scenario,
  bots: Number(process.env.MOCK_BOTS ?? 2),
  autoStart: process.env.MOCK_AUTOSTART === '1',
  speed: Number(process.env.MOCK_SPEED ?? 1),
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:5174',
});

mock.httpServer.listen(port, () => {
  console.log(`[mock] Faux serveur prêt sur http://localhost:${port} (contrat v1)`);
  console.log(
    `[mock] Salle toujours disponible : ${TEST_ROOM_CODE} · scénario par défaut : ${scenario}`,
  );
  for (const [name, { description }] of Object.entries(SCENARIOS)) {
    console.log(`[mock]   - ${name.padEnd(14)} ${description}`);
  }
});

const shutdown = async () => {
  await mock.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
