// @ts-check
/**
 * Configuration lue dans les variables d'environnement (modèle : `.env.example`).
 */
import { DEFAULT_RULES } from '@unlockers/shared';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 3000);
  return {
    port,
    /** Fichier SQLite ; relatif au dossier depuis lequel le serveur est lancé. */
    dbFile: env.DB_FILE ?? './data/unlockers.db',
    /** Base des liens pour rejoindre (`<publicUrl>/play?code=XXXX`) et du QR code. */
    publicUrl: (env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/+$/, ''),
    rules: {
      ...DEFAULT_RULES,
      durationSeconds: Number(env.GAME_DURATION ?? DEFAULT_RULES.durationSeconds),
      maxErrors: Number(env.MAX_ERRORS ?? DEFAULT_RULES.maxErrors),
    },
  };
}
