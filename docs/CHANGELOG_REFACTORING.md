# CHANGELOG — Refactoring frontend Vue 3

Ce fichier trace les **corrections de comportement fonctionnel** introduites
pendant le refactoring, distinctes des changements purement techniques
(élimination de duplications, remplacement de librairies, etc.).

Chaque entrée indique : le fichier legacy concerné, la nature du bug,
le fichier Vue où la correction est appliquée, et le statut de validation
par le chef de projet.

## État du projet (08/10/2026)

- **Migration terminée** : les 11 pages sont en Vue 3 (CDN, modules ES6) ;
  le legacy n'existe plus que dans le tag git `pre-bascule-vue`.
- **Visuel identique au legacy** : CSS legacy d'origine, balisage legacy,
  plus de Tailwind (voir « Reprise du visuel legacy »).
- **Corrections** : CORRECTION-01 à 12, toutes validées.
- **Restent ouverts** : 3 points « À confirmer » (frontend) et 8 points
  backend, dont le point 5 (mots de passe exposés), critique avant la mise
  en production, et le point 8 (adresses sans `.html`, cache des fichiers).

### Sommaire
- CORRECTION-01 à 12 — corrections de comportement, page par page
- Bascule finale (05/10/2026) — suppression du legacy, renommage des pages
- Reprise du visuel legacy (08/10/2026)
- À confirmer — choix fonctionnels en attente de décision
- Points ouverts backend — à traiter par l'équipe backend

---

## [CORRECTION-01] `logout()` ne redirige pas vers index.html

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | Tous les fichiers HTML authentifiés (~9 fichiers) |
| **Brique introduite**         | Brique 1 — `services/auth.js` |
| **Fichier Vue corrigé**       | `frontend/static/js/services/auth.js` — fonction `logout()` |
| **Statut**                    | ✅ **Validé** — décision du 27/09/2026 |

### Description du bug legacy
La fonction `logout()`, copiée dans chaque page, supprimait le token
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

### Impact
La route `/cloturer_demande/{id}/` exige un token (`Depends(get_current_user)`) :
dans le legacy, les clôtures échouaient donc avec une erreur 401. Avec la
correction, le token est envoyé et la clôture aboutit.

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
5. **Récapitulatif de la demande.** `GET /demande_particulier/{id}` renvoyait
   banque, type, catégorie, contrepartie, montant et date, mais le legacy n'en
   utilisait que `note_analyse`. Ces informations sont désormais affichées
   au-dessus des avis, dans un tableau au format legacy (même présentation
   que « Informations de la demande » de valider_demande).

### Changements techniques (sans validation requise)

- Accordéon des avis : un seul panneau ouvert à la fois, **le dernier avis
  ouvert par défaut**. Les panneaux sont identifiés par leur position et
  non plus par `event_d` (deux avis du même type s'ouvraient ensemble).
- Message d'erreur : le legacy référençait `donnee.detail` (variable
  inexistante), ce qui plantait l'affichage de l'erreur. Les erreurs passent
  désormais par `apiGet()` et un message `alert alert-danger`.
- Les deux appels API sont lancés en parallèle.
- Le bouton « Retour » ajouté lors de la migration a été retiré le 08/10/2026
  (absent du legacy).
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
   et d'envoi s'affichent désormais dans un message d'erreur
   (`alert alert-danger`) au-dessus du formulaire.
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
5. **Erreurs d'envoi.** Affichées dans un message d'erreur
   (`alert alert-danger`) au-dessus du formulaire (le legacy utilisait
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

## [CORRECTION-12] Connexion : blocage après login, mauvais identifiants

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `index.html` (et `index_.html`, ancienne version) |
| **Brique introduite**         | Brique index |
| **Fichiers Vue corrigés**     | `frontend/static/js/pages/LoginPage.js`, `frontend/static/js/services/auth.js`, `frontend/static/js/services/api.js` |
| **Statut**                    | ✅ **Validé** — décision du 05/10/2026 ; vitrine rétablie le 08/10/2026 |

### Corrections de comportement

1. **Vitrine.** Supprimée le 05/10/2026, puis **rétablie à l'identique le
   08/10/2026** (voir « Reprise du visuel legacy ») : en-tête, hero, section
   WorkFlow, connexion, pied de page.
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
- Lien « Mot de passe oublié ? » (`href="#"`, sans effet) : conservé pour
  le visuel, comme dans le legacy.
- Bootstrap 5, Bootstrap Icons, Poppins et le bloc `<style>` legacy sont
  chargés tels quels ; le JavaScript Bootstrap n'est plus chargé.

### Impact fonctionnel
Même parcours de connexion. Les messages d'erreur s'affichent dans tous les cas.

---

## Bascule finale (05/10/2026)

Sauvegarde : tag git **`pre-bascule-vue`** (commit `7547874`, poussé sur
`origin`). C'est la seule copie du legacy : aucune archive dans le dépôt.
Restaurer un fichier : `git checkout pre-bascule-vue -- frontend/<fichier>`.

### Supprimés (`git rm`)
- Pages legacy : `acceuil.html`, `chat.html`, `consulter_demandes.html`,
  `demandes_validation.html`, `detail_consulter_demande.html`,
  `ggrg_demandes_validation.html`, `historique.html`, `index.html`,
  `introduire_demandes.html`, `modifier_demande.html`, `valider_demande.html`
- Pages orphelines : `index_.html`, `acceuil_1.html`,
  `formulaire_inscription.html` (voir point ouvert 4)
- Dossiers : `js/`, `css/`, `Demandes/` (anciennes notes PDF de test ; le
  backend stocke les notes dans `/var/data/notes_analyse`),
  `assets/assets_index/` (plus aucune référence)
- Ressources legacy non référencées : `assets/assets_user/` (librairies du
  layout legacy, 20 Mo) et `images/image_impulsion.PNG` — le dossier
  `assets/` n'existe plus

Le 08/10/2026, les feuilles de style et polices de `assets/assets_user/`
ont été restaurées sous `static/vendor/uikit/` pour la reprise du visuel
legacy (sans aucun JavaScript).

### Renommés (`git mv`)
Chaque `*_vue.html` devient `*.html` (11 pages). Les URL des pages
redeviennent celles du legacy : favoris et liens existants restent valides.

### Vérifications
- `grep` : aucune occurrence de `_vue.html` dans le code ni dans `CLAUDE.md` ;
  aucune référence aux pages ou dossiers supprimés (hors commentaires
  historiques).
- Les 11 pages, les feuilles de style, les images et tous les modules
  `static/js/**/*.js` répondent HTTP 200 via `/workflow/`.
- Syntaxe JS (`node --check`) et compilation des templates Vue :
  aucune erreur.

---

## Reprise du visuel legacy (08/10/2026)

### Contexte
Les pages Vue utilisaient une mise en page Tailwind (sidebar sombre, cartes)
différente du legacy. **Décision du 08/10/2026 :** les 11 pages reprennent
exactement le visuel legacy, y compris la vitrine complète de la page de
connexion (captures de référence fournies par le chef de projet).

### Méthode
- **CSS legacy d'origine** restauré depuis le tag `pre-bascule-vue`
  (feuilles de style et polices uniquement, aucun JavaScript) :
  `static/vendor/uikit/` (bootstrap-material, shreerang-material, uikit,
  polices d'icônes, perfect-scrollbar.css, flot.css) et `static/css/design.css`.
- **`<head>` de chaque page** généré à partir du `<head>` legacy de la même
  page : mêmes feuilles de style, même ordre, mêmes blocs `<style>` inline,
  même classe `<html>`. Les `<script>` legacy (jQuery, Bootstrap JS, UIKit,
  amCharts…) sont retirés.
- **Templates Vue** réécrits avec le balisage legacy (classes, structure,
  libellés, styles inline). Tailwind et `tokens.css` sont supprimés.
- Nouveaux composants : `layout/AppLayout.js` (squelette `layout-wrapper`),
  `layout/NotificationPopup.js` (popup `#popup-nouvelle-demande`),
  `demandes/ActionCell.js` (cellule de bouton). Les autres composants
  partagés produisent désormais le balisage legacy.
- **Comportements du JavaScript legacy repris en Vue** : repli du menu
  (`layout-collapsed`, clé `localStorage.layoutCollapsed` du legacy),
  sous-menu « Menu », menu déroulant utilisateur, onglets, modales Bootstrap,
  accordéon des avis, popup. `static/css/app.css` contient les quelques
  règles que ce JavaScript appliquait à l'exécution.
- Comparaison par captures d'écran (Chrome headless), legacy et Vue côte à
  côte, sur les 10 pages connectées (`testawa`, `testggr`, `introci`) : rendu
  identique, hors écarts listés ci-dessous. Page de connexion : contrôlée
  sur les captures de référence (vitrine complète, défilement, formulaire).
  Aucune erreur JavaScript sur les 11 pages avec les 4 comptes de recette.

### Écarts volontaires avec le legacy

Reproduits page par page, comme dans le legacy (décision du 08/10/2026) :
- Libellé du sous-menu : « Actions » sur demandes_validation et chat,
  « Menu » ailleurs. Sur ces deux pages, « Statistiques » garde aussi
  l'icône cadenas legacy.
- Boutons « Arrêté » / « Terme » désactivés (grisés) sur demandes_validation
  (relevé en comparant avec les fichiers legacy de production fournis par
  le chef de projet).

Harmonisations (le legacy variait d'une page à l'autre) :
- Barre du haut : nom de l'utilisateur **à droite** sur toutes les pages
  (9 pages legacy sur 10 ; l'accueil le plaçait à gauche à cause d'une
  coquille de classe, `navbar-collapSellapse`).
- Lien « Accueil » partout (« Acceuil » sur une page legacy).
- Sous-menu : mêmes liens sur toutes les pages, filtrés selon le niveau
  d'habilitation (logique de l'accueil legacy). Certaines pages legacy
  omettaient « Historique » ou le lien de validation GGR, ce qui privait
  certains profils de ces liens.

Textes alignés sur les captures de référence (le tag `pre-bascule-vue` en
diffère) : hero « WORK FLOW » (« WORK WORK » dans le tag), bouton d'en-tête
« Se Connecter » (« Login » dans le tag).

Conservés comme dans le legacy, à la demande du chef de projet (08/10/2026) :
- Liens « Login », « Signup », « FAQ » du menu latéral : ils mènent toujours
  à des pages inexistantes (404).

Corrections :
- Tableaux : en-têtes de colonnes de la page GGR alignés sur les données
  (le legacy affichait « Entité » au-dessus des contreparties).
- Corrections déjà validées conservées, au style legacy : badge « Nouveau »,
  popup de notification, tableau récapitulatif et dernier avis ouvert sur la
  page détail (CORRECTION-08), messages d'erreur (`alert alert-danger`),
  « Aucune note jointe », « Demande introuvable », bouton désactivé pendant
  l'envoi (CORRECTION-09 à 12).

Retraits d'ajouts non legacy :
- Filtres retirés de « Consulter mes demandes » et des deux pages de
  validation : absents du legacy (ils restent sur l'accueil et l'historique,
  comme dans le legacy).
- Bouton « Retour » retiré de la page détail.

Non reproduit (JavaScript legacy non chargé) :
- Effet « ripple » au clic (material-ripple.js), barre de chargement Pace.
  Le JavaScript de la vitrine (défilement doux, lien actif, en-tête au
  défilement, menu mobile, apparition en fondu) est repris en Vue.
- Barres de défilement PerfectScrollbar : remplacées par un défilement natif
  à barre fine (même zone, même hauteur).

### Impact fonctionnel
Visuel identique au legacy. **Changement visible par l'utilisateur** par
rapport aux pages Vue précédentes.

---

## Améliorations techniques (13/10/2026)

Sans changement visuel ni fonctionnel, sauf mention contraire. Contrôle par
captures d'écran avant / après (Chrome headless) des 11 pages avec
`testawa`, `testggr` et `introci`.

### 1. Documentation hors du dossier servi
`frontend/` est servi tel quel sous `/workflow` : ce fichier était donc
public (`/workflow/CHANGELOG_REFACTORING.md`). Il est déplacé (`git mv`)
dans `docs/CHANGELOG_REFACTORING.md` ; l'ancienne adresse répond 404. Aucun
autre fichier non destiné au navigateur (.md, .txt, .sql, sauvegardes)
n'est présent dans `frontend/`.

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
3. **Lien actif du menu (toutes les pages).** Comme dans le legacy, « Accueil »
   reste en surbrillance sur toutes les pages et le sous-menu (« Menu » ou
   « Actions ») est fermé au chargement. À trancher : mettre en surbrillance la page courante
   et ouvrir le sous-menu qui la contient.

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

### Point 6 — Accueil des filiales : `/demandes_a_consulter/{domaine}` en erreur 500

Pour les comptes de filiale (`introci`, `dgci`), l'endpoint plante :
`A value is required for bind parameter 'user_id'` (paramètre SQL non
fourni). Le tableau de l'accueil affiche une ligne « Impossible de charger
les données » ; les cartes de compteurs restent affichées. Le legacy
affichait un tableau vide.

### Point 7 — Historique AIG/GGR : `/demandes_cloturer/` en erreur 500

Pour `testggr` (AIG, GGR) : `column a.heure_avis does not exist`. Le tableau
de l'historique affiche une ligne « Impossible de charger les données ».
`testawa` n'est pas concerné.

*(Points 6 et 7 identifiés lors de la recette de bascule — 05/10/2026)*

### Point 8 — Adresses sans `.html` et cache des fichiers

**Demande :** afficher `/workflow/acceuil` au lieu de `/workflow/acceuil.html`
dans la barre d'adresse, comme sur les sites modernes.

**Pourquoi le backend :** `app.mount("/workflow", StaticFiles(...))`
(`backend/main.py`) ne sert que les noms de fichiers exacts :
`/workflow/acceuil` répond 404. Masquer `.html` en JavaScript
(`history.replaceState`) casserait le rechargement, les favoris et les liens
copiés.

**Code proposé** (à ajouter dans `backend/main.py`, **avant**
`app.mount("/workflow", ...)`) :

```python
from pathlib import Path
from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

@app.get("/workflow/", include_in_schema=False)
async def page_accueil_site():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/workflow/{page}", include_in_schema=False)
async def page_sans_extension(page: str, request: Request):
    query = f"?{request.url.query}" if request.url.query else ""
    # Anciennes adresses en .html : redirection vers l'adresse propre (favoris conservés)
    if page.endswith(".html"):
        return RedirectResponse(f"/workflow/{page[:-5]}{query}", status_code=301)
    # Adresse propre : on sert le fichier .html correspondant
    fichier = FRONTEND_DIR / f"{page}.html"
    if not page.replace("_", "").isalnum() or not fichier.is_file():
        raise HTTPException(status_code=404)
    return FileResponse(fichier, headers={"Cache-Control": "no-cache"})
```

**Effets :**
- `/workflow/acceuil` sert `acceuil.html` ; l'adresse affichée reste propre.
- `/workflow/acceuil.html?id_dmd=3` redirige (301) vers
  `/workflow/acceuil?id_dmd=3` : favoris et liens existants conservés.
- Un seul segment d'adresse est capté : `static/…` et `images/…` restent
  servis par le `mount`. Seuls lettres, chiffres et `_` sont acceptés
  (pas de remontée de dossier).
- `Cache-Control: no-cache` sur les pages.

**Cache des modules JavaScript (lié) :** le serveur n'envoie aucun en-tête
`Cache-Control` sur `static/`. Après une livraison, les navigateurs peuvent
garder les anciens modules `static/js/…` avec les nouvelles pages HTML, et
la page s'affiche sans mise en forme (constaté en recette le 08/10/2026).
Proposition : envoyer aussi `Cache-Control: no-cache` sur `/workflow/static/`
(par exemple via un middleware), pour que le navigateur revalide chaque
fichier (réponse 304 si inchangé).

**Côté frontend, une fois la route en place :** retirer `.html` de tous les
liens internes (menu latéral, boutons Détails / CHAT / Modifier / Evaluer,
redirections après connexion, déconnexion et session expirée), puis
vérification par grep et captures. Les fichiers restent `*.html` sur le
disque ; les chemins relatifs `static/…` et `images/…` restent valides.
**Ne pas modifier les liens avant la mise en place de la route** (ils
répondraient 404).

*(Demandé par le chef de projet le 08/10/2026)*

---

## Règle adoptée à partir de la brique demandes_validation

> Toute correction de comportement fonctionnel (pas uniquement style ou
> lisibilité) doit être soumise au chef de projet **avant** d'être appliquée.
> Elle sera consignée ici avec statut "Validé" ou "Refusé — comportement
> legacy conservé".

**Assouplissement du 05/10/2026 :** pour la fin de la migration, les bugs
évidents (plantages, variables non définies, succès affiché avant la
vérification de la réponse, code mort) peuvent être corrigés sans validation
préalable, puis consignés ici comme corrections validées (CORRECTION-09 à 12).
Les vrais choix fonctionnels vont dans « À confirmer ».
