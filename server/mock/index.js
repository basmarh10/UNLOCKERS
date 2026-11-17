// @ts-check
/**
 * Faux serveur (mock) : rejouera des scénarios scriptés (lobby, partie, erreur, focus,
 * déconnexion, victoire, défaite) en respectant le contrat v1 de `@unlockers/shared`.
 *
 * S0 : coquille. S1 : tâche Notion « Mock-server : rejouer des événements scriptés ».
 */
import { EVENTS } from '@unlockers/shared';

console.log(
  `[mock] Coquille S0 prête : ${Object.keys(EVENTS).length} événements dans le contrat v1.`,
);
