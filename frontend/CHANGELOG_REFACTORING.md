# CHANGELOG — Refactoring frontend Vue 3 / Tailwind

Ce fichier trace les **corrections de comportement fonctionnel** introduites
pendant le refactoring, distinctes des changements purement techniques
(élimination de duplications, remplacement de librairies, etc.).

Chaque entrée indique : le fichier legacy concerné, la nature du bug,
le fichier Vue où la correction est appliquée, et le statut de validation
par le chef de projet.

---

## [CORRECTION-01] `logout()` ne redirige pas vers index.html

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | Tous les fichiers HTML authentifiés (~9 fichiers) |
| **Brique introduite**         | Brique 1 — `services/auth.js` |
| **Fichier Vue corrigé**       | `frontend/static/js/services/auth.js` — fonction `logout()` |
| **Statut**                    | ✅ **Validé** — décision du 27/09/2026 |
mais ne redirigeait pas :
```js
// legacy (dans chaque fichier HTML)
async function logout() {
    localStorage.removeItem("token");
    //window.location.href = 'index.html';  ← commenté partout
}
```
L'utilisateur qui cliquait "Déconnexion" restait sur la page courante avec
le token supprimé. La page restait visible mais tout appel API suivant
échouait avec 401.

### Correction appliquée
```js
// auth.js
export function logout() {
  _clearToken();
  window.location.href = "index.html";  // ← redirection réactivée
}
```

### Impact fonctionnel
Après déconnexion, l'utilisateur est désormais redirigé vers `index.html`
au lieu de rester sur la page courante. **Changement visible par l'utilisateur.**

---

## [CORRECTION-02] Gestion globale des réponses HTTP 401

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | Tous les fichiers HTML authentifiés (aucun ne gérait les 401) |
| **Brique introduite**         | Brique 1 (initial : vérification tokenExpiry) — **Révisé** après décision du 27/09/2026 |
| **Fichier Vue corrigé**       | `frontend/static/js/services/api.js` — fonction `_checkResponse()` |
| **Statut**                    | ✅ **Validé** — décision du 27/09/2026 |

### Contexte
La version initiale (Brique 1) activait la vérification de `tokenExpiry`
dans `auth.js`. Refusée car la valeur stockée (1h) ne correspond pas à
l'expiration réelle du token backend (30 min). La vérification côté client
était donc trop optimiste.

### Approche retenue
Plutôt que de gérer l'expiration côté client avec une durée arbitraire,
le serveur fait autorité : toute réponse HTTP 401 déclenche une déconnexion
et une redirection vers `index.html`.

```js
// api.js — _checkResponse()
if (response.status === 401) {
  localStorage.removeItem("token");
  window.location.href = "index.html";
  throw new Error("[API] Session expirée — redirection vers index.html");
}
```

### Impact fonctionnel
Si le token backend expire (après 30 min d'inactivité ou à sa durée de vie),
le premier appel API suivant reçoit un 401 et redirige l'utilisateur vers
le login. **Comportement identique pour tous les endpoints** car tous passent
par `_checkResponse()`.

### Ce qui ne change pas
`tokenExpiry` reste stocké dans localStorage par `index.html` mais n'est
toujours pas lu côté client — laissé en l'état intentionnellement.

---

## [CORRECTION-03] Header `Authorization` hors de l'objet `headers` dans `confirmSubmission()`

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `ggrg_demandes_validation.html` — fonction `confirmSubmission()` |
| **Brique introduite**         | Brique ggrg_demandes_validation |
| **Fichier Vue corrigé**       | `frontend/static/js/pages/GgrgValidationPage.js` — fonction `handleCloturer()` |
| **Statut**                    | ✅ **Validé** — confirmé par `Depends(get_current_user)` sur la route, décision du 27/09/2026 |

### Description du bug legacy
```js
// ggrg_demandes_validation.html — confirmSubmission()
const response = await fetch(`${API_URL}/cloturer_demande/${demande_id}`, {
    method: 'POST',
    body: formData,
    "Authorization": "Bearer " + token   // ← hors de headers:{} → silencieusement ignoré
});
```
Le header `Authorization` était placé directement dans les options `fetch()`
au lieu d'être dans l'objet `headers: {}`. L'API `fetch` ignore les clés
inconnues au niveau des options — le token n'était donc jamais envoyé.

### Impact attendu
Si l'endpoint `/cloturer_demande/` vérifie le token côté serveur (dépend
de la configuration FastAPI), toutes les clôtures échouaient avec 401 ou
étaient acceptées sans authentification selon la politique du middleware.
**À confirmer par test sur la version legacy avant de valider cette correction.**

### Correction appliquée
```js
// GgrgValidationPage.js — handleCloturer()
await apiPostForm(`/cloturer_demande/${pendingCloId.value}`, fd);
// apiPostForm() ajoute systématiquement "Authorization: Bearer <token>"
// dans les headers via _authHeadersOnly()
```

---

## [CORRECTION-04] `showAlert` de succès affiché avant vérification `response.ok`

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `valider_demande.html` — fonction `confirmSubmission()` |
| **Brique introduite**         | Brique valider_demande |
| **Fichier Vue corrigé**       | `frontend/static/js/pages/ValiderDemandePage.js` |
| **Statut**                    | ✅ **Validé** — décision du 27/09/2026 |

### Description du bug legacy
```js
// legacy — confirmSubmission()
const response = await fetch(`${API_URL}/valider_avis/...`);
showAlert('validation en cours', type = 'success');   // ← avant response.ok
await new Promise(resolve => setTimeout(resolve, 2000));
if (!response.ok) { throw new Error(...); }           // ← trop tard
```
L'alerte "validation en cours" (verte) s'affichait même si le serveur
renvoyait une erreur HTTP, donnant une fausse impression de succès.

### Correction appliquée
L'alerte de succès est déplacée après la vérification `response.ok`.
En cas d'erreur HTTP, seule l'alerte d'erreur s'affiche.

---

## [CORRECTION-05] Suppression de la détection de nouveau message sur les demandes clôturées

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `historique.html` — fonction `fillTable_dmd_insert()` |
| **Brique introduite**         | Brique historique |
| **Fichier Vue corrigé**       | `frontend/static/js/pages/HistoriquePage.js` |
| **Statut**                    | ✅ **Validé** — décision du 01/10/2026 |

### Description du bug legacy

```js
// historique.html — fillTable_dmd_insert()
//const badge = hasNewMessage ? `<span ...>Nouveau</span>` : '';   // ← commenté
const row = `
  <td>${escapeHtml(t.banque || 'N/A')} ${badge}<br></td>   // ← badge = undefined
`;
```

La variable `badge` est référencée mais sa déclaration est commentée.
Le mot `undefined` s'affichait littéralement dans la colonne Banque pour chaque ligne.
De plus, la fonction faisait `N` appels `GET /messages_chat/{id}` (un par ligne)
pour alimenter une détection qui ne s'affichait jamais.

### Correction appliquée

Suppression complète du bloc de détection de nouveaux messages et des N appels
`/messages_chat/`. La page historique affiche des demandes clôturées qui n'ont
plus de workflow actif ; la détection de message n'y a pas de valeur ajoutée.

### Impact fonctionnel

La colonne Banque n'affiche plus `undefined`. Le chargement de la page ne déclenche
plus N requêtes supplémentaires. **Changement visible par l'utilisateur** (disparition
du texte parasite "undefined" dans chaque ligne).

---

## [CORRECTION-06] `API_URL` en dur dans tous les fichiers frontend

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | Tous les fichiers HTML (13 fichiers) + `services/api.js` |
| **Fichier Vue corrigé**       | `frontend/static/js/services/api.js` + 13 fichiers `.html` |
| **Statut**                    | ✅ **Validé** — décision du 01/10/2026 |

### Description

Chaque fichier HTML déclarait `const API_URL = "https://workflow-awa.onrender.com/api"` (ou `http://127.0.0.1:8000/api`) en dur, avec l'autre URL commentée. `api.js` avait la même duplication.

### Correction appliquée

```js
// Avant (dans chaque fichier)
//const API_URL = "http://127.0.0.1:8000/api";
const API_URL = "https://workflow-awa.onrender.com/api";

// Après (dans tous les fichiers)
const API_URL = `${window.location.origin}/api`;
```

FastAPI sert le frontend sous `/workflow/` — la page et l'API partagent toujours la même origine. `window.location.origin` est donc toujours correct sans configuration.

### Impact fonctionnel

Fonctionne en local (`http://127.0.0.1:8000`) et en production (`https://workflow-awa.onrender.com`) sans aucune modification de code entre les deux environnements.

---

## [CORRECTION-07] Redirection vers `admin_acceuil.html` inexistant après login

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | `index.html` — fonction `login()` ; `index_.html` — fonction `login()` |
| **Brique introduite**         | Brique login (index) — appliquée lors de la migration de la page de connexion |
| **Fichier Vue corrigé**       | Page de connexion Vue (à venir) |
| **Statut**                    | ✅ **Validé** — décision du 05/10/2026 |

### Description du bug legacy
```js
// index.html — login()
if (role === "user") {
    window.location.href = 'acceuil_vue.html';
} else {
    window.location.href = 'admin_acceuil.html';   // ← fichier inexistant
}
```
`checkUserRole()` renvoie `"admin"` pour `id_niv_hab === 4`. Ces utilisateurs
étaient redirigés vers `admin_acceuil.html`, qui n'existe pas : 404 après
une connexion réussie.

### Correction appliquée
Tous les utilisateurs, quel que soit leur `id_niv_hab`, sont redirigés vers
l'accueil après connexion.

### Impact fonctionnel
Les utilisateurs de niveau 4 accèdent désormais à l'application au lieu
d'une page 404. **Changement visible par l'utilisateur.**

---

## Points ouverts backend (à sécuriser avant mise en production)

### Point 1 — `POST /api/register` sans authentification

`POST /api/register` n'exige aucun token ni droit particulier. N'importe qui
ayant accès au réseau peut créer un compte rattaché à n'importe quelle banque
(y compris AWA — niveau central) et avec n'importe quel niveau d'habilitation.

**Risque :** création de comptes non autorisés avec droits élevés.

**À discuter avec l'équipe backend :** restreindre cet endpoint à un rôle
administrateur, ou le supprimer du périmètre public et fournir un mécanisme
d'invitation sécurisé.

*(Identifié lors de la création du compte de test local — 01/10/2026)*

### Point 2 — Colonne `users.password` en clair

Colonne users.password en clair : volontaire pour les tests, à supprimer avant
mise en production.

### Point 3 — Dépendances `requirements.txt`

requirements.txt : psycopg absent et version de SQLAlchemy non fixée, une
installation propre plante au démarrage. Ajouter psycopg[binary] ou fixer
sqlalchemy<2.1.

requirements.txt indique bcrypt==3.2.0 ; bcrypt 5.x casse le login. Garder
cette version fixée.

*(Identifié lors de la réinitialisation de la base locale — 02/10/2026)*

### Point 4 — Historique incomplet

`/demandes_cloturer/` ne renvoie que `id_event = 6` ; les demandes clôturées
(7), supprimées (8) et rejetées (9) n'apparaissent dans aucun endpoint
d'historique.

### Point 5 — `POST /avis/` générique, sans contrôle

`id_event = 8` (suppression) est posé depuis le frontend via le `POST /avis/`
générique. Ce endpoint n'exige **aucune authentification** (pas de
`get_current_user`) et ne vérifie pas le droit de l'utilisateur à poser
l'`id_event` envoyé : n'importe qui peut faire avancer, approuver ou supprimer
une demande.

**À discuter avec l'équipe backend :** authentifier l'endpoint et contrôler,
côté serveur, quel `id_event` chaque profil (banque / entité) peut poser.

### Point 6 — Rejets aux niveaux AWA, AIG et GGR

Gestion à clarifier : seul le rejet local (`id_event = 9`, DG Local) est
identifié. Aucun statut de rejet n'existe pour les niveaux AWA, AIG et GGR.

### Point 7 — Secrets dans le dépôt

`backend/.env` est suivi par git dans un dépôt public ; `backend/email_utils.py`
contient des identifiants SMTP en dur. Retirer `.env` du suivi
(`git rm --cached`), passer les identifiants SMTP en variables d'environnement
et changer les secrets exposés (ils restent dans l'historique git).

*(Points 4 à 7 identifiés lors de la constitution du jeu de test — 05/10/2026)*

### Point 8 — Notes d'analyse servies sans authentification dans `frontend/Demandes/`

`frontend/Demandes/` contient d'anciennes notes d'analyse (PDF). Comme
FastAPI monte tout `frontend/` sous `/workflow`, ces fichiers sont
téléchargeables par n'importe qui via `/workflow/Demandes/<fichier>.pdf`,
sans token. Le backend écrit aujourd'hui dans `backend/notes_analyse`.

**Côté frontend :** le dossier sera déplacé dans `legacy_frontend/` (hors du
dossier servi) lors de la bascule finale.

**À discuter avec l'équipe backend :** vérifier qu'aucune donnée n'est
référencée vers ce dossier et décider de son sort (suppression ou archivage
hors serveur).

### Point 9 — Plus de création de compte depuis l'interface

`formulaire_inscription.html` n'est pas migré (page orpheline, et elle
s'appuie sur `POST /api/register` sans authentification — voir Point 1).
Après la bascule, **aucune création de compte n'est possible depuis
l'interface**.

**À définir :** le processus de création des comptes (rôle administrateur
côté backend, invitation, script d'exploitation…).

*(Points 8 et 9 identifiés lors de la préparation de la bascule finale — 05/10/2026)*

---

## Règle adoptée à partir de la brique demandes_validation

> Toute correction de comportement fonctionnel (pas uniquement style ou
> lisibilité) doit être soumise au chef de projet **avant** d'être appliquée.
> Elle sera consignée ici avec statut "Validé" ou "Refusé — comportement
> legacy conservé".
