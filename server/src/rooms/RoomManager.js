// @ts-check
/**
 * Registre des salles en mémoire : création avec un code unique, recherche par code.
 */
import { isValidRoomCode, normalizeRoomCode } from '@unlockers/shared';
import { Room } from './Room.js';
import { generateRoomCode } from './roomCode.js';

export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} code → salle */
    this.rooms = new Map();
  }

  /**
   * Crée une salle vide en lobby.
   * @param {string} [forcedCode] code imposé (mock, tests) ; tiré au hasard sinon
   * @returns {Room}
   */
  create(forcedCode) {
    let code;
    if (forcedCode === undefined) {
      code = generateRoomCode({ isTaken: (c) => this.rooms.has(c) });
    } else {
      code = normalizeRoomCode(forcedCode);
      if (!isValidRoomCode(code)) throw new Error(`Code de salle invalide : ${code}`);
      if (this.rooms.has(code)) throw new Error(`Code de salle déjà utilisé : ${code}`);
    }
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  /**
   * Retrouve une salle à partir d'un code saisi (espaces et minuscules tolérés).
   * @param {string} code
   * @returns {Room | undefined}
   */
  get(code) {
    return this.rooms.get(normalizeRoomCode(code));
  }

  /**
   * @param {string} code
   * @returns {boolean}
   */
  delete(code) {
    return this.rooms.delete(normalizeRoomCode(code));
  }

  get size() {
    return this.rooms.size;
  }
}
