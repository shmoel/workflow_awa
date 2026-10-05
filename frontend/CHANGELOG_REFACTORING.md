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

### Exception : `POST /login/`
Sur la page de connexion, un 401 signifie « identifiants incorrects ».
`apiPost()` accepte l'option `{ redirectOn401: false }`, utilisée par
`auth.login()` : la page reste affichée avec le message d'erreur au lieu
de se recharger (ajouté lors de la migration de index, 05/10/2026).

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
| **Fichier Vue corrigé**       | `frontend/static/js/pages/LoginPage.js` |
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

## [CORRECTION-08] Page détail d'une demande : plantages et informations manquantes

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `detail_consulter_demande.html` |
| **Brique introduite**         | Brique detail_consulter_demande |
| **Fichiers Vue corrigés**     | `frontend/static/js/pages/DetailDemandePage.js`, `frontend/static/js/components/demandes/AvisTimeline.js` |
| **Statut**                    | ✅ **Validé** — décision du 05/10/2026 |

### Corrections de comportement

1. **Popup de notification.** Le bloc HTML `#popup-nouvelle-demande` était
   commenté dans le legacy, mais le polling tournait : à la détection d'une
   nouvelle demande, `showPopupDemandesList()` plantait sur `popup === null`
   et rien ne s'affichait. La popup s'affiche désormais comme sur les autres
   pages.
2. **Demande sans note d'analyse.** `note_analyse.split(...)` plantait sur
   `null` et le bouton gardait un lien vide. La page affiche désormais
   « Aucune note jointe ».
3. **Nom du fichier de note.** Le legacy ne découpait le chemin que sur `\`.
   Il est désormais découpé sur `\` et `/`, puis encodé et passé à
   `downloadUrl()`.
4. **`id_dmd` absent, invalide ou inconnu.** Le legacy envoyait les appels avec
   `null` et plantait. La page affiche « Demande introuvable » avec un lien
   vers l'accueil.
5. **Carte récapitulative.** `GET /demande_particulier/{id}` renvoyait banque,
   type, catégorie, contrepartie, montant et date, mais le legacy n'en
   utilisait que `note_analyse`. Ces informations sont désormais affichées
   en tête de page.

### Changements techniques (sans validation requise)

- Accordéon des avis : un seul panneau ouvert à la fois, **le dernier avis
  ouvert par défaut**. Les panneaux sont identifiés par leur position et
  non plus par `event_d` (deux avis du même type s'ouvraient ensemble).
- Message d'erreur : le legacy référençait `donnee.detail` (variable
  inexistante), ce qui plantait l'affichage de l'erreur. Les erreurs passent
  désormais par `apiGet()` et un bandeau.
- Les deux appels API sont lancés en parallèle.
- Bouton « Retour » (page précédente, ou accueil si la page a été ouverte
  directement).
- Code mort non repris : `showConfirmation()`, `confirmSubmission()`
  (`POST /valider_avis/{id}/process_ongoing/1`, sans header `Authorization`)
  et `confirmerEnvoi()`. Aucun élément de la page ne les déclenchait.

### Impact fonctionnel
La page indique désormais de quelle demande il s'agit, ne plante plus sur
une demande sans note, et affiche la popup de notification.
**Changements visibles par l'utilisateur.**

---

## [CORRECTION-09] Introduction d'une demande : erreurs silencieuses et code mort

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `introduire_demandes.html` |
| **Brique introduite**         | Brique introduire_demandes |
| **Fichiers Vue corrigés**     | `frontend/static/js/pages/IntroduireDemandePage.js`, `frontend/static/js/components/demandes/DemandeForm.js` |
| **Statut**                    | ✅ **Validé** — consigne du 05/10/2026 (corriger les bugs évidents) |

### Corrections de comportement

1. **Erreurs d'envoi invisibles.** `confirm_introduction()` levait des
   exceptions non interceptées (profil introuvable, réponse non JSON) :
   la modale se fermait et rien ne s'affichait. Les erreurs de chargement
   et d'envoi s'affichent désormais dans un bandeau.
2. **Double soumission.** Le bouton reste actif pendant l'envoi dans le
   legacy ; il est désormais désactivé (« Envoi… »).
3. **Erreurs de contrôle du fichier.** `alert()` remplacé par un message
   sous le champ « Note d'analyse » (mêmes règles : obligatoire, PDF uniquement).

### Changements techniques (sans validation requise)

- Formulaire extrait dans `components/demandes/DemandeForm.js`, partagé
  avec la modification ; modale de succès dans `components/ui/InfoModal.js`.
- Appels avec la barre finale (`/demandes/`, `/avis/`, `/types_demandes/{entite}/`) :
  le legacy passait par une redirection 307 de FastAPI.
- `POST /demandes/` et `POST /avis/` envoient désormais le header
  `Authorization` (via `api.js`) ; le legacy ne l'envoyait pas.
- Code mort non repris : `confirmerEnvoi()` (appelait `demande_register()`,
  inexistante), `showConfirmation_validation()`.

### Impact fonctionnel
Parcours identique (confirmation, création de la demande puis de l'avis
initial `id_event = 1`, modale « Demande Bien enregistrée ! », rechargement).
Les erreurs sont désormais visibles.

---

## [CORRECTION-10] Modification d'une demande : banque, lien de la note, validation

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `modifier_demande.html` |
| **Brique introduite**         | Brique modifier_demande |
| **Fichiers Vue corrigés**     | `frontend/static/js/pages/ModifierDemandePage.js` (réutilise `DemandeForm.js`) |
| **Statut**                    | ✅ **Validé** — consigne du 05/10/2026 (corriger les bugs évidents) |

### Corrections de comportement

1. **Mauvaise banque présélectionnée.** Le legacy faisait
   `selectedIndex = id_banque - 1`, faux dès que les id de banque ne se
   suivent pas. La banque est désormais sélectionnée par son id.
2. **Lien « Consulter la note » cassé après une modification.**
   `/update_demandes/` enregistre le chemin complet du fichier
   (`/var/data/notes_analyse\20261005_..._note.pdf`) ; le legacy l'ajoutait
   tel quel à `/api/download/`. Le nom de fichier est désormais extrait
   (séparateurs `\` et `/`) puis encodé, comme sur la page détail.
3. **Confirmation avant validation du formulaire.** Le bouton « Modifier »
   ouvrait la modale au clic, même avec des champs obligatoires vides. La
   modale ne s'ouvre plus qu'après validation des champs.
4. **`id_dmd` absent, invalide ou inconnu.** Le legacy envoyait les appels
   avec `null` et plantait. La page affiche « Demande introuvable » avec un
   lien vers « Consulter mes demandes ».
5. **Erreurs d'envoi.** Affichées dans un bandeau (le legacy utilisait
   `alert()` ou plantait sans message) ; bouton désactivé pendant l'envoi.

### Changements techniques (sans validation requise)

- Formulaire partagé avec l'introduction (`DemandeForm`, note facultative,
  sans contrôle de type de fichier, comme le legacy).
- Code mort non repris : `showConfirmation_validation()`, gestionnaire
  `submit` vide, balise `<script>` vide.

### Impact fonctionnel
Parcours identique (confirmation, `POST /update_demandes/{id}`, modale
« Demande modifiée avec succès », redirection vers `consulter_demandes.html`).
**Changements visibles :** bonne banque présélectionnée, lien de note valide.

---

## [CORRECTION-11] Chat : message affiché malgré une erreur, badge « Nouveau »

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `chat.html` |
| **Brique introduite**         | Brique chat |
| **Fichiers Vue corrigés**     | `frontend/static/js/pages/ChatPage.js`, `frontend/static/js/services/chatSeen.js` |
| **Statut**                    | ✅ **Validé** — consigne du 05/10/2026 (corriger les bugs évidents) |

### Corrections de comportement

1. **Message affiché avant la vérification de la réponse.** Si
   `/commenter` renvoyait une erreur HTTP, le legacy affichait une `alert()`
   puis ajoutait quand même le message à la conversation. Le message n'est
   désormais affiché qu'après une réponse OK ; sinon un message d'erreur
   apparaît sous la zone de saisie et le texte saisi est conservé.
2. **Badge « Nouveau » sur ses propres messages.** L'accueil compare
   `lastMsg_{id}` au dernier message de la demande, mais seul le clic
   « CHAT » de l'accueil mettait cette clé à jour. Un message envoyé depuis
   le chat déclenchait donc le badge « Nouveau » chez son propre auteur.
   Le chat marque désormais le dernier message comme vu au chargement et
   après chaque envoi. Logique partagée avec `AccueilPage` dans
   `services/chatSeen.js`.
3. **Popup de notification.** Même bug que la page détail (bloc HTML
   commenté, polling actif) : la popup s'affiche désormais.
4. **`id_dmd` absent, invalide ou inconnu.** « Demande introuvable » avec
   un lien vers l'accueil (le legacy affichait les valeurs fictives de la
   maquette : « DEM-2024-001234 », « Marie Martin »…).

### Changements techniques (sans validation requise)

- Après un envoi, la conversation est rechargée depuis l'API (heure serveur)
  au lieu d'ajouter le message avec l'heure du navigateur.
- `POST /commenter/` envoie désormais le header `Authorization` et la
  barre finale (le legacy passait par une redirection 307).
- Code mort non repris : `getBotResponse()` (réponses simulées
  « BanqueBot », jamais affichées, 1 s d'attente à chaque envoi).
- `AvisTimeline` non réutilisé : le chat affiche les messages (table
  `commentaires`), pas l'historique des avis.

### Impact fonctionnel
Plus de faux message en cas d'erreur, plus de badge « Nouveau » sur ses
propres messages. **Changements visibles par l'utilisateur.**

---

## [CORRECTION-12] Connexion : page sans vitrine, blocage après login

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `index.html` (et `index_.html`, ancienne version) |
| **Brique introduite**         | Brique index |
| **Fichiers Vue corrigés**     | `frontend/static/js/pages/LoginPage.js`, `frontend/static/js/services/auth.js`, `frontend/static/js/services/api.js` |
| **Statut**                    | ✅ **Validé** — décision du 05/10/2026 (formulaire seul, sans vitrine) |

### Corrections de comportement

1. **Vitrine supprimée.** La page ne contient plus que le formulaire de
   connexion aux couleurs AWA (logo, « WORKFLOW - AWA », « Accès Sécurisé »).
   Hero, présentation, navigation par ancres et animations ne sont pas repris.
2. **Niveau 4** redirigé vers l'accueil (CORRECTION-07, appliquée ici).
3. **Blocage après login.** Si `/users/me/` échouait, le legacy affichait
   « Connexion réussie ! » et ne redirigeait jamais. Un message d'erreur
   s'affiche désormais.
4. **Mauvais identifiants.** Passant désormais par `api.js`, un 401 aurait
   rechargé la page (CORRECTION-02) : exception ajoutée pour `/login/`.

### Changements techniques (sans validation requise)

- Logique de connexion déléguée à `auth.login()` (token et `tokenExpiry`
  stockés comme dans le legacy).
- Attente artificielle de 2 s avant redirection supprimée.
- Lien mort « Mot de passe oublié ? » (`href="#"`) non repris.
- Bootstrap, Bootstrap Icons, AOS et les styles inline de la vitrine ne sont
  plus chargés.

### Impact fonctionnel
Même parcours de connexion ; page plus simple. **Changement visible par
l'utilisateur.**

---

## À confirmer

Choix fonctionnels tranchés au plus près du legacy pendant la migration ;
à valider par le chef de projet.

1. **Comptes du seed et menus (introduire_demandes).** Le menu reprend la
   logique legacy : « Introduire demande » visible pour le **Niveau 2**,
   masqué pour le Niveau 1. Or le seed attribue le Niveau 1 (« Saisie —
   introduction des demandes ») à `introci` / `introsn` et le Niveau 2
   (« Validateur local ») à `risqueci` / `dgci`. `introci` n'a donc pas le
   lien dans le menu (la page reste accessible par son URL). Legacy conservé ;
   à trancher : corriger le seed ou la logique de menu.
2. **Demande sans avis initial (introduire_demandes).** Comme dans le legacy,
   la demande puis l'avis initial sont créés en deux appels. Si le second
   échoue, la demande existe sans avis et n'apparaît dans aucune liste.
   L'erreur est désormais affichée ; un endpoint unique côté backend
   éviterait ce cas.

---

## Points ouverts backend (à sécuriser avant mise en production)

**Failles de sécurité backend :** rapport détaillé transmis à l'équipe backend
le 05/10/2026 (hors dépôt).

### Point 1 — Dépendances `requirements.txt`

requirements.txt : psycopg absent et version de SQLAlchemy non fixée, une
installation propre plante au démarrage. Ajouter psycopg[binary] ou fixer
sqlalchemy<2.1.

requirements.txt indique bcrypt==3.2.0 ; bcrypt 5.x casse le login. Garder
cette version fixée.

*(Identifié lors de la réinitialisation de la base locale — 02/10/2026)*

### Point 2 — Historique incomplet

`/demandes_cloturer/` ne renvoie que `id_event = 6` ; les demandes clôturées
(7), supprimées (8) et rejetées (9) n'apparaissent dans aucun endpoint
d'historique.

### Point 3 — Rejets aux niveaux AWA, AIG et GGR

Gestion à clarifier : seul le rejet local (`id_event = 9`, DG Local) est
identifié. Aucun statut de rejet n'existe pour les niveaux AWA, AIG et GGR.

*(Points 2 et 3 identifiés lors de la constitution du jeu de test — 05/10/2026)*

### Point 4 — Plus de création de compte depuis l'interface

`formulaire_inscription.html` n'est pas migré (page orpheline). Après la
bascule, **aucune création de compte n'est possible depuis l'interface**.

**À définir :** le processus de création des comptes (rôle administrateur
côté backend, invitation, script d'exploitation…).

*(Identifié lors de la préparation de la bascule finale — 05/10/2026)*

### Point 5 — Mots de passe renvoyés par `/messages_chat/{id}` (critique)

`GET /messages_chat/{id_demande}` fait `SELECT * FROM commentaires JOIN users` :
chaque message renvoie aussi les colonnes `password` (mot de passe en clair)
et `hashed_password` de son auteur, à tout utilisateur connecté.
Le frontend n'affiche que `commentaire`, `username`, `id_user`,
`date_creation` et `heure_creation`, mais les données transitent dans la
réponse. **À corriger côté backend** (lister les colonnes) ; la colonne
`password` en clair dans `users` est à supprimer.

`GET /users/me/` renvoie de même `password` et `hashed_password` de
l'utilisateur connecté (pas de `response_model`). Le frontend n'en lit que
`username` et `id_niv_hab`.

*(Identifié lors de la migration du chat — 05/10/2026)*

---

## Règle adoptée à partir de la brique demandes_validation

> Toute correction de comportement fonctionnel (pas uniquement style ou
> lisibilité) doit être soumise au chef de projet **avant** d'être appliquée.
> Elle sera consignée ici avec statut "Validé" ou "Refusé — comportement
> legacy conservé".
