# Module 1 : La pharmacie

> Responsable : Alan · Sprint S2 · **Module modèle** (le premier codé, il sert d'exemple pour les autres)
> Identifiant : `pharmacy`

## Résumé

Un patient doit recevoir le bon médicament, à la bonne dose. L'armoire est visible par tous sur l'écran commun, mais chaque téléphone ne détient qu'**un morceau** de l'information : l'ordonnance, le registre de la pharmacie, la fiche de sécurité ou le cahier de garde. Un seul joueur a les contrôles et doit être guidé par les autres.

Mécanique volontairement simple : c'est le module modèle, il doit valider le moteur (setup, viewFor, handleAction, redistribution) plus que la difficulté.

## Habillage (provisoire, à valider en atelier)

Shanghai, 1941. Hôpital fictif de la Concession. Un médicament a été contaminé : il faut soigner un patient avant la perquisition, sans toucher aux flacons suspects. Les noms de médicaments sont d'époque pour l'ambiance.

## Ce que voit l'écran commun

Une armoire de **6 flacons**, numérotés de 1 à 6. Chaque flacon a :
- une **couleur de bouchon** parmi : rouge, vert, bleu, ambre, blanc ;
- un **symbole** sur l'étiquette parmi : croix, croissant, étoile, cercle, triangle, losange.

L'écran ne montre **aucun nom de médicament**. Il réagit aux résultats (flacon qui s'allume, erreur, module résolu).

## Les 4 pièces d'information

| Pièce | Contenu | Exemple |
|---|---|---|
| `prescription` (ordonnance) | Nom du patient + médicament prescrit | « Patient : M. Lin · Médicament : Quinine » |
| `registry` (registre) | Correspondance médicament → symbole, pour les 6 médicaments | « Quinine : losange, Iode : croix, … » |
| `safety` (fiche de sécurité) | 2 couleurs de bouchon contaminées, à ne jamais utiliser | « Bouchons ambre et vert : NE PAS UTILISER » |
| `dosage` (cahier de garde) | Liste de 4 patients avec leur nombre de doses (1 à 4) | « M. Lin : 3 doses, Mme Zhao : 1 dose, … » |

Médicaments : Quinine, Iode, Morphine, Camphre, Digitaline, Sulfamide.

**Langues (voir `docs/lore.md`, section Agents)** : le registre est écrit en chinois (`lang: "zh"`), l'ordonnance et la fiche de sécurité en français (`lang: "fr"`, hôpital de la Concession). Un agent qui parle la langue reçoit la pièce traduite. Sinon, la pièce arrive en version brute avec un lexique : par exemple 奎宁 = Quinine, 碘 = Iode, 吗啡 = Morphine, 樟脑 = Camphre, 洋地黄 = Digitaline, 磺胺 = Sulfamide. La répartition tourniquet ci-dessous reste la règle par défaut ; le moteur l'ajuste seulement pour donner une pièce à un agent compatible quand c'est possible.

## Contrôles

Le joueur qui a les contrôles (le « préparateur ») voit sur son téléphone :
1. 6 boutons **Flacon 1 à 6** (sélection, pas encore d'erreur possible) ;
2. un sélecteur **Doses : 1 à 4** ;
3. un bouton **Administrer**, qui envoie l'action.

Les autres joueurs voient leur pièce d'information, sans contrôles.

## Répartition selon le nombre de joueurs

Ordre des pièces : `[prescription, registry, safety, dosage]`. La pièce `i` va à `slots[i % n]`. Les contrôles vont toujours à `slots[0]`.

| Joueurs | `slots[0]` | `slots[1]` | `slots[2]` | `slots[3]` |
|---|---|---|---|---|
| 2 | contrôles + ordonnance + sécurité | registre + cahier | | |
| 3 | contrôles + ordonnance + cahier | registre | sécurité | |
| 4 | contrôles + ordonnance | registre | sécurité | cahier |

Propriété garantie : **personne ne peut résoudre seul**, car l'ordonnance et le registre ne sont jamais sur le même téléphone.

En cas de **redistribution** (un joueur parti), on rappelle simplement `viewFor` avec la nouvelle liste `slots` : la répartition se recalcule toute seule, l'état du module ne change pas.

## Génération (`setup`)

À partir de `rng` :
1. Associer aléatoirement les 6 médicaments aux 6 symboles (registre).
2. Choisir le médicament prescrit et un nom de patient (parmi une liste de 8 noms).
3. Choisir 2 couleurs contaminées.
4. Générer les 6 flacons de façon à ce que **exactement 2 flacons** portent le symbole du médicament prescrit :
   - le **bon flacon** a une couleur saine ;
   - le **leurre** a une couleur contaminée.
   Les 4 autres flacons ont des symboles différents de celui-ci, couleurs au hasard.
5. Générer le cahier de garde : le patient prescrit + 3 autres, chacun avec un nombre de doses de 1 à 4.

Le leurre force l'équipe à utiliser la fiche de sécurité : sans elle, une chance sur deux de se tromper.

### État (exemple)

```json
{
  "registry": { "Quinine": "diamond", "Iode": "cross", "Morphine": "star", "Camphre": "circle", "Digitaline": "crescent", "Sulfamide": "triangle" },
  "prescription": { "patient": "M. Lin", "drug": "Quinine" },
  "contaminated": ["amber", "green"],
  "bottles": [
    { "color": "red", "symbol": "star" },
    { "color": "amber", "symbol": "diamond" },
    { "color": "blue", "symbol": "cross" },
    { "color": "white", "symbol": "diamond" },
    { "color": "green", "symbol": "circle" },
    { "color": "blue", "symbol": "triangle" }
  ],
  "dosage": { "M. Lin": 3, "Mme Zhao": 1, "M. Wu": 4, "Mme Chen": 2 },
  "solution": { "bottle": 4, "doses": 3 }
}
```

`solution` n'est jamais envoyé au client.

## Vues

`screenView(state)` : `{ bottles: [{ index, color, symbol }] }`

`viewFor(state, slot, slots)` :

```json
{
  "canAct": true,
  "pieces": [
    { "type": "prescription", "patient": "M. Lin", "drug": "Quinine" },
    { "type": "safety", "contaminated": ["amber", "green"] }
  ]
}
```

## Actions (`handleAction`)

| Action | Condition | Résultat |
|---|---|---|
| `{ type: "administer", bottle: 1-6, doses: 1-4 }` | envoyée par un slot qui n'a pas `canAct` | refus `INVALID_ACTION` (pas d'erreur comptée) |
| idem | bon flacon et bonnes doses | `solved` |
| idem | mauvais flacon ou mauvaises doses | `error` (le module reste actif, même état) |

Après une erreur, l'état ne change pas : l'équipe corrige et réessaie.

## Solution (pour l'exemple ci-dessus)

1. L'ordonnance dit **Quinine** pour **M. Lin**.
2. Le registre dit Quinine = **losange**.
3. Deux flacons ont un losange : le 2 (ambre) et le 4 (blanc). La fiche de sécurité interdit l'ambre, donc **flacon 4**.
4. Le cahier de garde dit M. Lin = **3 doses**.
5. Le préparateur choisit flacon 4, 3 doses, Administrer.

## Tests Vitest

- `setup` : exactement 2 flacons avec le symbole cible, le bon a une couleur saine, le leurre une couleur contaminée ; le patient prescrit est dans le cahier.
- `setup` : même graine = même état (déterminisme).
- `viewFor` à 2, 3 et 4 joueurs : chaque pièce est distribuée une seule fois, ordonnance et registre jamais sur le même slot, un seul slot a `canAct`.
- `viewFor` ne contient jamais `solution`.
- `handleAction` : bonne réponse → `solved`, mauvais flacon → `error`, mauvaises doses → `error`, slot sans contrôles → refus.

## Pistes si trop facile

- Passer à 3 couleurs contaminées et 3 flacons au bon symbole.
- Ajouter une règle au cahier : « si le patient a plus de 60 ans, une dose de moins ».
