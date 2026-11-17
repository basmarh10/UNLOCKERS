// @ts-check
/**
 * Point d'entrée du serveur.
 *
 * S0 : simple coquille pour que `npm run dev` et `npm start` fonctionnent.
 * S1 : Express + Socket.IO + /api/health (tâche Notion « Serveur Express + Socket.IO + /api/health »).
 */
import { DEFAULT_RULES } from '@unlockers/shared';

const port = Number(process.env.PORT ?? 3000);

console.log(`[server] Coquille S0 prête (port prévu : ${port}).`);
console.log(`[server] Règles par défaut : ${JSON.stringify(DEFAULT_RULES)}`);
