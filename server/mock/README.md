# Mock-server UNLOCKERS

Faux serveur qui parle **exactement le contrat v1** (`@unlockers/shared`). Il sert à coder l'écran (Sara) et le téléphone (Alan) sans attendre le vrai moteur de jeu.

## Lancer

```bash
npm run dev:mock                                   # mock + écran + téléphone
MOCK_SCENARIO=focus npm run mock -w @unlockers/server   # mock seul, autre scénario
```

Il écoute sur `http://localhost:3000`, comme le vrai serveur : rien à changer côté proxy Vite.

| Variable | Défaut | Rôle |
|---|---|---|
| `MOCK_SCENARIO` | `victory` | Scénario joué après `game:start` |
| `MOCK_BOTS` | `2` | Faux joueurs qui rejoignent le lobby (un par seconde) |
| `MOCK_AUTOSTART` | (vide) | `1` : la partie se lance seule après l'arrivée des bots |
| `MOCK_SPEED` | `1` | Accélère le temps (`10` = dix fois plus vite) |

L'écran peut aussi choisir son scénario à la connexion, sans redémarrer le mock :

```js
const socket = io({ query: { scenario: 'defeat-time' } });
```

## Salle `TEST`

La salle **`TEST`** existe toujours : `screen:join { code: 'TEST' }` et `player:join { code: 'TEST', nickname }` marchent sans appeler l'API. `POST /api/games` crée aussi de vraies salles, avec le même QR code que le vrai serveur. Un code inconnu renvoie `error` `GAME_NOT_FOUND`, comme en vrai.

## Scénarios

| Nom | Ce qui se passe |
|---|---|
| `lobby` | Des bots arrivent, la partie ne démarre pas seule |
| `victory` | Les 4 modules sont résolus, le module final se déverrouille, victoire |
| `defeat-errors` | 3 erreurs sur différents modules, défaite `too_many_errors` |
| `defeat-time` | Partie de 10 s, défaite `time_up` |
| `focus` | Bascules de focus + erreurs `NOT_FOCUSED`, `FOCUS_COOLDOWN`, `MODULE_LOCKED` aux téléphones |
| `disconnect` | P1 se déconnecte (`game:paused`), revient (`game:resumed`), repart et ses infos sont redistribuées |

Les étapes sont décrites dans [`scenarios.js`](scenarios.js) : on peut en ajouter en quelques lignes.

## Jouer depuis un vrai téléphone

Pendant une partie, le téléphone peut aussi envoyer :

- `module:focus { moduleId }` : bascule le focus pour tout le monde (`MODULE_LOCKED` sur le module final verrouillé) ;
- `module:action { moduleId, action }` avec `action` = `'ok'`, `'error'` ou `'solve'` (`NOT_FOCUSED` si ce n'est pas le module en focus).

Chaque téléphone reçoit **sa propre** `player:view` : `view.slot` et `view.hint` changent selon la place.

## Ce que le mock ne fait pas

Pas de vraie logique de module, pas de délai de 2 s sur le focus, pas de pause si un vrai téléphone se déconnecte. Ces règles sont dans le vrai serveur (S2-S4).
