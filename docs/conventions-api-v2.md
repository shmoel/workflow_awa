# Conventions de l'API v2 — WORKFLOW AWA

> **Statut : proposition, à valider par le binôme back/front.**
> Ce document est le contrat entre le backend (FastAPI) et le nouveau front (Vue 3 + Tailwind via CDN).
> Toute modification passe par une PR relue par l'autre partie (voir §10).
>
> **État d'alignement du frontend actuel** (ce qui est déjà appliqué, ce qui attend le backend) :
> voir `docs/CHANGELOG_REFACTORING.md`, section « Alignement sur les conventions API v2 ».

---

## 1. Objectif et périmètre

- L'API v2 est servie sous le préfixe **`/api/v2`**. Elle coexiste avec l'API actuelle (`/api/...`), qui reste en place tant que l'ancien front (`/workflow`) l'utilise.
- Le nouveau front est migré **écran par écran**. Chaque écran migré consomme uniquement des routes v2.
- Les routes d'authentification sont **communes** aux deux versions (§7).
- Aucune route v1 n'est modifiée pour les besoins du front Vue : on crée la route v2 correspondante.

## 2. Source de vérité

1. Le **schéma OpenAPI** généré par FastAPI (`/docs`, `/openapi.json`) fait foi pour la forme exacte des requêtes et réponses.
2. Chaque route v2 déclare un `response_model` Pydantic **typé** (jamais `dict` ni `list[dict]`) : ce qui n'est pas dans le schéma ne sort pas de l'API.
3. Ce document fixe les **règles communes** ; en cas de désaccord entre ce document et `/docs`, on corrige l'un des deux dans la même PR.

## 3. URL et méthodes HTTP

| Règle | Exemple |
|---|---|
| Ressources au **pluriel** | `/api/v2/demandes` |
| Segments composés en **kebab-case** | `/api/v2/referentiels/types-demande` |
| Paramètres de requête en **snake_case** | `?id_banque=3&page=2` |
| Identifiant dans le chemin | `/api/v2/demandes/{id}` |
| Sous-ressource rattachée | `/api/v2/demandes/{id}/messages` |
| Action métier du workflow = **sous-ressource en POST** | `POST /api/v2/demandes/{id}/validation` |
| L'utilisateur connecté | `GET /api/v2/moi` |
| Pas de slash final | `/api/v2/demandes` (et non `/demandes/`) |

| Méthode | Usage | Succès |
|---|---|---|
| `GET` | Lire, sans effet de bord | `200` |
| `POST` | Créer une ressource ou déclencher une action | `201` (création) / `200` (action) |
| `PATCH` | Modifier partiellement (seuls les champs envoyés changent) | `200` |
| `PUT` | Remplacer entièrement (rare) | `200` |
| `DELETE` | Supprimer | `204` (sans corps) |

**Règles de sécurité qui s'imposent aux URL :**
- Le serveur ne fait **jamais confiance** à une information d'identité ou de périmètre venant du client : l'auteur, l'utilisateur, la banque ou le domaine sont déduits du **token**, pas d'un paramètre (`id_user`, `domaine`… ne figurent plus dans les URL ni les formulaires).
- Les actions du workflow (validation, clôture) sont décidées **côté serveur** : le front n'envoie jamais `id_event`, `id_valideur` ni `id_niveauValidation`.

## 4. Format des réponses (succès)

**Objet seul** — la ressource est renvoyée directement :

```json
GET /api/v2/demandes/12   →   200
{
  "id": 12,
  "nom_client": "ACME SA",
  "montant": "1500000.00",
  "statut": { "code": "EN_VALIDATION", "libelle": "En cours de validation" },
  "cree_le": "2026-01-15T10:05:00+00:00"
}
```

**Liste** — toujours paginée, toujours la même forme :

```json
GET /api/v2/demandes?page=1&taille=20   →   200
{
  "items": [ { "id": 12, "...": "..." }, { "id": 11, "...": "..." } ],
  "total": 47,
  "page": 1,
  "taille": 20
}
```

- Une liste vide renvoie `200` avec `"items": []` et `"total": 0` (jamais `404`).
- `DELETE` réussi renvoie `204` sans corps.

## 5. Format des erreurs

Toutes les erreurs v2 ont la même forme :

```json
{
  "code": "DEMANDE_INTROUVABLE",
  "detail": "Demande introuvable"
}
```

- **`code`** : identifiant **stable**, en MAJUSCULES_SNAKE_CASE. C'est lui que le front teste (jamais le texte).
- **`detail`** : message lisible en français, affichable tel quel à l'utilisateur. Il ne contient **jamais** d'information technique (requête SQL, chemin serveur, pile d'appels) : ces informations vont dans les logs du serveur.
- Les erreurs de validation ajoutent **`champs`** : `{ "nom_du_champ": "message" }`.

```json
422
{
  "code": "VALIDATION",
  "detail": "Certaines données sont invalides",
  "champs": { "montant": "doit être supérieur à 0", "nom_client": "obligatoire" }
}
```

| HTTP | `code` | Signification | Comportement attendu du front |
|---|---|---|---|
| 400 | `REQUETE_INVALIDE`, `FICHIER_INVALIDE` | Requête incohérente | Afficher `detail` |
| 401 | `AUTH_REQUISE`, `SESSION_EXPIREE` | Pas de token, token invalide ou expiré | Effacer le token, rediriger vers la connexion avec le message « session expirée » |
| 403 | `ACCES_REFUSE` | Connecté mais pas autorisé pour cette **action** | Afficher `detail`, ne pas déconnecter |
| 404 | `<RESSOURCE>_INTROUVABLE` | N'existe pas **ou** l'utilisateur n'a pas le droit de la voir | Afficher « introuvable » |
| 409 | `CONFLIT`, `TRANSITION_INTERDITE` | État incompatible (ex. demande déjà clôturée) | Afficher `detail`, recharger la donnée |
| 413 | `FICHIER_TROP_VOLUMINEUX` | Fichier > 5 Mo | Afficher `detail` |
| 422 | `VALIDATION` | Champs invalides | Afficher les messages de `champs` sous chaque champ |
| 500 | `ERREUR_INTERNE` | Incident serveur | Message générique « une erreur est survenue, réessayez » |

> **Pourquoi 404 et non 403 pour un objet non autorisé ?** Répondre 403 révèlerait que la demande existe. Le 403 est réservé aux **actions** interdites sur une ressource que l'utilisateur peut voir.

## 6. Champs, types et dates

| Élément | Règle | Exemple |
|---|---|---|
| Noms de champs | `snake_case`, en français, cohérents avec la base | `nom_client`, `id_typedemande` |
| Identifiants | entier, champ `id` pour la ressource elle-même | `"id": 12` |
| Référence à une autre ressource | `id_<ressource>` (+ objet imbriqué si utile à l'affichage) | `"id_banque": 3, "banque": { "id": 3, "sigle": "AIG" }` |
| Date seule | ISO 8601 `AAAA-MM-JJ` | `"2026-01-15"` |
| Date + heure | ISO 8601 avec décalage horaire | `"2026-01-15T10:05:00+00:00"` |
| Montants | **chaîne décimale** à 2 décimales (évite les erreurs d'arrondi des nombres flottants) | `"montant": "1500000.00"` |
| Booléens | `true` / `false` | `"cloturee": false` |
| Valeur absente | `null` (le champ reste présent) | `"commentaire": null` |
| Statuts / énumérations | objet `{ code, libelle }`, le front teste `code` | `{ "code": "CLOTUREE", "libelle": "Clôturée" }` |

- Les champs `date` + `heure` séparés de la base actuelle sont exposés en **un seul** champ date-heure (`cree_le`, `valide_le`…).
- Les mots de passe (clair ou haché) ne figurent **jamais** dans une réponse.

## 7. Authentification et session

Routes communes v1/v2 (inchangées) :

| Route | Usage |
|---|---|
| `POST /api/login/` | `{ "username", "password" }` → `{ "access_token", "token_type": "bearer" }` |
| `POST /api/refresh-token/` | Avec le token courant → nouveau token |
| `GET /api/v2/moi` | Utilisateur connecté, son rattachement et **ses permissions** (à créer) |

Règles :
- Chaque appel authentifié envoie l'en-tête **`Authorization: Bearer <token>`**. Le token est stocké dans `localStorage` (clé `token`).
- Durée de vie d'un token : 35 min. **Déconnexion après 30 min d'inactivité**, **reconnexion obligatoire après 10 h** (le serveur refuse alors le renouvellement).
- Le front reproduit le comportement de `frontend/js/design.js` :
  - clé `derniereActivite` dans `localStorage`, partagée entre onglets ;
  - renouvellement du token pendant l'activité (au plus une fois par minute) quand il lui reste moins de 30 min ;
  - au-delà de 30 min d'inactivité, ou sur toute réponse `401`, effacer le token et rediriger vers la connexion.
- L'affichage des menus selon le rôle est un **confort d'interface** : la sécurité réelle est appliquée par le serveur (`403` / `404`).

**Module d'appels côté Vue** : tous les appels passent par **un seul module** (ex. `api.js`) qui :
- utilise des **URL relatives** (`/api/v2/...`), jamais d'adresse en dur (`127.0.0.1`, `onrender.com`) ;
- ajoute l'en-tête `Authorization` ;
- traduit les erreurs selon le tableau du §5 (notamment `401` → déconnexion) ;
- gère l'activité et le renouvellement du token.

## 8. Fichiers

**Envoi** — `multipart/form-data`, en même temps que les champs de la ressource :

```
POST /api/v2/demandes        Content-Type: multipart/form-data
champs : id_typedemande, nom_client, montant, commentaire_intro, note_analyse (fichier)
```

- Extensions acceptées : `.pdf`, `.jpg`, `.jpeg`, `.png` ; taille maximale **5 Mo**.
- Le serveur renomme le fichier ; le nom d'origine est conservé pour l'affichage.

**Téléchargement** — toujours authentifié, jamais par un simple lien `<a href>` (un lien n'envoie pas le token) :

```js
const r = await api.get(`/api/v2/demandes/${id}/note-analyse`, { brut: true });
const url = URL.createObjectURL(await r.blob());
window.open(url);            // puis URL.revokeObjectURL(url) après usage
```

## 9. Pagination, tri, filtres

| Paramètre | Règle | Exemple |
|---|---|---|
| `page` | à partir de 1 (défaut 1) | `?page=2` |
| `taille` | défaut 20, maximum 100 | `?taille=50` |
| `tri` | nom du champ, préfixe `-` pour décroissant | `?tri=-cree_le` |
| Filtres | paramètre = nom du champ filtré | `?id_banque=3&statut=EN_VALIDATION` |
| `vue` | vue métier prédéfinie d'une liste | `?vue=a-valider` |

## 10. Faire évoluer le contrat

1. Toute nouvelle route ou modification de route v2 se fait par une **PR** qui contient : le code, le schéma Pydantic, les tests, et la mise à jour de ce document si une règle change.
2. La PR est **relue par l'autre membre du binôme** (back ↔ front) avant fusion.
3. **Ajouter** un champ ne casse rien. **Renommer, retirer ou changer le type** d'un champ casse le front : on ajoute le nouveau champ, on migre le front, puis on retire l'ancien.
4. Une route remplacée est marquée `deprecated=True` (visible dans `/docs`), puis supprimée quand plus aucun écran ne l'appelle.
5. Le test `tests/test_routes.py` fige la liste des routes exposées : il doit être mis à jour dans la même PR.

## 11. Exemple complet : `GET /api/v2/demandes/{id}`

**Requête**
```
GET /api/v2/demandes/12
Authorization: Bearer eyJhbGciOi...
```

**Réponses**

| Cas | HTTP | Corps |
|---|---|---|
| Demande visible par l'utilisateur | 200 | objet `Demande` (ci-dessous) |
| Pas de token / token expiré | 401 | `{ "code": "SESSION_EXPIREE", "detail": "Votre session a expiré" }` |
| N'existe pas, ou hors du périmètre de l'utilisateur | 404 | `{ "code": "DEMANDE_INTROUVABLE", "detail": "Demande introuvable" }` |

```json
{
  "id": 12,
  "nom_client": "ACME SA",
  "montant": "1500000.00",
  "commentaire_intro": "Renouvellement de ligne",
  "type_demande": { "id": 4, "libelle": "Ligne de crédit", "categorie": "RISQUE" },
  "banque": { "id": 3, "sigle": "AIG" },
  "demandeur": { "id": 7, "nom": "Martin", "prenom": "Alice" },
  "statut": { "code": "EN_VALIDATION", "libelle": "En cours de validation" },
  "note_analyse": { "nom": "Note analyse ACME.pdf", "disponible": true },
  "cree_le": "2026-01-15T10:05:00+00:00",
  "actions_possibles": ["valider", "commenter"]
}
```

`actions_possibles` est calculé par le serveur selon le rôle de l'utilisateur et l'étape de la demande : le front affiche les boutons correspondants, sans recalculer les règles.

## 12. Correspondance ancienne API → API v2

Proposition de cible, **à confirmer au moment de la migration de chaque écran**. Statut : `à faire` / `en cours` / `fait`.

| Route actuelle (`/api`) | Route v2 proposée | Écrans | Statut |
|---|---|---|---|
| `POST /login/`, `POST /refresh-token/` | inchangées (communes) | connexion, toutes | — |
| `GET /users/me/`, `GET /users-joined/` | `GET /api/v2/moi` | toutes | à faire |
| `GET /banques/`, `/niveaux_hab/`, `/entites/`, `/postes/`, `/domaine/`, `/decisions/` | `GET /api/v2/referentiels/{banques\|niveaux-habilitation\|entites\|postes\|domaines\|decisions}` | inscription, introduire, valider | à faire |
| `GET /types_demandes/{categorie}/` | `GET /api/v2/referentiels/types-demande?categorie=` | introduire, modifier | à faire |
| `POST /register`, `POST /user_domaine/` | selon décision D1 (auto-inscription) | inscription | bloqué (D1) |
| `POST /demandes/` + `POST /avis/` | `POST /api/v2/demandes` (l'avis initial est créé par le serveur) | introduire | à faire |
| `POST /update_demandes/{id}` | `PATCH /api/v2/demandes/{id}` | modifier | à faire |
| `GET /demandes/{id}`, `GET /demande_particulier/{id}` | `GET /api/v2/demandes/{id}` | détail, valider, modifier, chat | à faire |
| `GET /demandes_user/`, `/demandes_user_valider/`, `/demandes_fin_process/` | `GET /api/v2/demandes?vue=mes-demandes\|en-cours\|terminees` | consulter | à faire |
| `GET /demandes_a_consulter/{domaine}` | `GET /api/v2/demandes?vue=a-consulter` (domaine déduit du token) | accueil | à faire |
| `GET /demandes_a_valider/`, `/demandes_deja_valider/` | `GET /api/v2/demandes?vue=a-valider\|deja-validees` | validation | à faire |
| `GET /demandes_a_cloturer/`, `/demandes_cloturer/` | `GET /api/v2/demandes?vue=a-cloturer\|cloturees` | validation GGRG, historique | à faire |
| `GET /derniere_demande_a_valider/`, `/{id_avis}` | `GET /api/v2/notifications?apres={id}` | toutes (pop-up) | à faire |
| `GET /nombre_demandes/{niveau}` | `GET /api/v2/demandes/statistiques` | accueil | à faire |
| `GET /commentaires_demande/{id}` | `GET /api/v2/demandes/{id}/avis` | détail, valider | à faire |
| `POST /valider_avis/{id}/process_ongoing/{x}` | `POST /api/v2/demandes/{id}/validation` | détail, valider | bloqué (D3) |
| `POST /cloturer_demande/{id}/` | `POST /api/v2/demandes/{id}/cloture` | validation GGRG | bloqué (D3) |
| `GET /messages_chat/{id}`, `POST /commenter/` | `GET` / `POST /api/v2/demandes/{id}/messages` | chat, accueil, historique | à faire |
| `GET /download/{fichier}` | `GET /api/v2/demandes/{id}/note-analyse` | détail, valider, modifier | à faire |
| `GET /test` | inchangée (contrôle de santé) | — | — |

**Décisions métier qui bloquent certaines lignes** : D1 (auto-inscription), D3 (matrice des droits et transitions du workflow). Voir la feuille de route.
