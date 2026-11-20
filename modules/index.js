// @ts-check
/**
 * Registre des modules de jeu.
 *
 * Ajouter un module = créer son dossier `modules/<module-id>/` puis l'ajouter ici.
 * Le format d'un module (config.json + server.js) est défini par Alan et Basma (S0),
 * voir `ModuleDefinition` dans `@unlockers/shared/types.js`.
 *
 * ⚠️ Ce fichier n'importe que la partie serveur : il ne doit jamais être embarqué côté client.
 */

/** @type {Array<{ config: import('@unlockers/shared/types.js').ModuleConfig, server: import('@unlockers/shared/types.js').ModuleDefinition }>} */
export const modules = [];
