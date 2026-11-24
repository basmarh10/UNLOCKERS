// @ts-check
/**
 * Validation (Zod) des messages reçus des clients. On ne fait jamais confiance au client :
 * tout message mal formé est refusé avec l'erreur INVALID_PAYLOAD.
 */
import { z } from 'zod';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
} from '@unlockers/shared';

/** Code de salle : normalisé (majuscules, sans espaces). L'existence est vérifiée après. */
const roomCode = z.string().transform(normalizeRoomCode).pipe(z.string().length(ROOM_CODE_LENGTH));

/** `screen:join` */
export const screenJoinSchema = z.object({ code: roomCode });

/** `player:join` */
export const playerJoinSchema = z.object({
  code: roomCode,
  nickname: z.string().trim().min(NICKNAME_MIN_LENGTH).max(NICKNAME_MAX_LENGTH),
  playerId: z.string().uuid().optional(),
});

/** Identifiant de module : texte court (l'existence est vérifiée par la partie). */
const moduleId = z.string().min(1).max(64);

/** `module:focus` */
export const moduleFocusSchema = z.object({ moduleId });

/** `module:action` : le contenu de `action` est validé par le module lui-même. */
export const moduleActionSchema = z.object({ moduleId, action: z.unknown() });
