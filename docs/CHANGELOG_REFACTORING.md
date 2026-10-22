# CHANGELOG — Refactoring frontend Vue 3

Ce fichier trace les **corrections de comportement fonctionnel** introduites
pendant le refactoring, distinctes des changements purement techniques
(élimination de duplications, remplacement de librairies, etc.).

Chaque entrée indique : le fichier legacy concerné, la nature du bug,
le fichier Vue où la correction est appliquée, et le statut de validation
par le chef de projet.

## État du projet (21/10/2026)

- **Migration terminée** : les 11 pages sont en Vue 3 (hébergé localement, modules ES6) ;
  le legacy n'existe plus que dans le tag git `pre-bascule-vue`.
- **Visuel identique au legacy, en Tailwind** : depuis le 20/10/2026, le CSS
  legacy est remplacé par des classes Tailwind (Play CDN 3.4.17, copie locale
  de secours) ; rendu comparé au pixel près (voir « Passage à Tailwind »).
- **Corrections** : CORRECTION-01 à 17, toutes validées.
- **Améliorations techniques (13/10/2026)** : documentation hors du dossier
  servi, bibliothèques hébergées localement, CSS allégé, session alignée
  sur 30 min.
- **Conventions API v2** (21/10/2026) : contrat `docs/conventions-api-v2.md` ;
  appliqué au frontend dans la mesure du possible, le reste attend le backend
  (voir « Alignement sur les conventions API v2 »).
- **Restent ouverts** : 3 points « À confirmer » (frontend ; le n°1 est résolu) et 15 points
  backend, dont le point 5 (mots de passe exposés), critique avant la mise
  en production, et le point 8 (adresses sans `.html`, cache des fichiers).

### Sommaire
- CORRECTION-01 à 17 — corrections de comportement, page par page
- Bascule finale (05/10/2026) — suppression du legacy, renommage des pages
- Reprise du visuel legacy (08/10/2026)
- Améliorations techniques (13/10/2026) — documentation, bibliothèques locales, CSS, session
- Passage à Tailwind (20/10/2026) — Play CDN figé, secours local, rendu identique au legacy
- Alignement sur les conventions API v2 (21/10/2026) — appliqué / reste à faire
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

## [CORRECTION-13] Icône X (Twitter) absente du pied de page de la vitrine

| Champ        | Valeur |
|---|---|
| **Fichier legacy concerné**   | `index.html` |
| **Introduite par**            | Hébergement local des bibliothèques (13/10/2026, point 2) |
| **Fichier corrigé**           | `frontend/index.html` (feuille `static/vendor/bootstrap-icons/`) |
| **Statut**                    | ✅ **Validé** — décision du 13/10/2026 |

### Description du bug legacy
Décalage de versions : `index.html` chargeait Bootstrap Icons **1.10.0**,
les autres pages la 1.11.1. L'icône `bi-twitter-x` n'existe qu'à partir de
la 1.11.0 : le premier rond des réseaux sociaux du pied de page était vide.

### Correction appliquée
Une seule version locale, 1.11.1, pour toutes les pages : l'icône X
s'affiche. Seul écart relevé par les captures avant / après.

---

## [CORRECTION-14] Session expirée : retour à la connexion sans explication

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | Toutes les pages connectées |
| **Fichiers corrigés**         | `services/api.js` (401), `services/auth.js` (jeton périmé), `pages/LoginPage.js` |
| **Statut**                    | ✅ **Validé** — décision du 21/10/2026 (conventions API v2 §5, §7) |

### Description
Sur un 401 ou un jeton périmé côté client, l'utilisateur était renvoyé vers
`index.html` sans aucun message (CORRECTION-02).

### Correction appliquée
Le message « Votre session a expiré. Veuillez vous reconnecter. » s'affiche
au-dessus du formulaire de connexion, et la page défile jusqu'à la section
Connexion. Indicateur `sessionExpiree` en `sessionStorage`, effacé à
l'affichage. Pas de message après une déconnexion volontaire.

---

## [CORRECTION-15] Messages d'erreur techniques affichés aux utilisateurs

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | Toutes les pages (messages d'erreur des tableaux, formulaires, chat) |
| **Fichier corrigé**           | `services/api.js` (classe `ApiError`) |
| **Statut**                    | ✅ **Validé** — décision du 21/10/2026 (conventions API v2 §5) |

### Description
Les messages d'erreur affichés reprenaient le texte technique de l'appel,
par exemple « [API – GET /demandes_cloturer/] HTTP 500: Erreur lors de
l'exécution de la requête SQL : (psycopg.errors.UndefinedColumn) … » : nom
de route, code HTTP et erreur SQL visibles par l'utilisateur.

### Correction appliquée
Chaque erreur est une `ApiError` (`status`, `code`, `detail`, `champs`) dont
le message suit le tableau du §5 : `detail` du serveur pour 400, 403, 409 et
413 ; « Introuvable. » pour 404 ; un message par champ pour 422 (formats v1
et v2) ; « Une erreur est survenue, réessayez. » pour 500 ; « Le serveur ne
répond pas… » si le serveur est injoignable. Les détails techniques restent
dans la console.

---

## [CORRECTION-16] Pas de retour vers la liste depuis les pages d'une demande

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | `detail_consulter_demande.html`, `chat.html`, `modifier_demande.html`, `valider_demande.html` |
| **Fichiers corrigés**         | `components/ui/BackArrow.js` (nouveau), `DetailDemandePage.js`, `ChatPage.js`, `ModifierDemandePage.js`, `ValiderDemandePage.js` |
| **Statut**                    | ✅ **Validé** — décision du 22/10/2026 (amélioration d'ergonomie, écart volontaire au visuel legacy) |

### Description
Ces quatre pages s'ouvrent depuis une liste (`?id_dmd=`). Seuls le bouton
« précédent » du navigateur ou le menu latéral permettaient d'y revenir, et
le menu ne signale pas la page courante (« À confirmer » n°3).

### Correction appliquée
Petite flèche cliquable (icône feather `icon-arrow-left`, grise, orange au
survol) en haut du contenu, alignée sur le bord gauche de la carte. Elle
ramène à la page précédente si elle appartient à l'application (la liste
d'origine) ; sinon (favori, lien copié) à une page de repli : accueil
(détail, chat), Mes demandes (modifier), Demandes à valider (valider).

Vérifié le 22/10/2026 : 4 parcours liste → page → flèche, 4 ouvertures
directes (repli), aucune erreur JavaScript.

### Impact fonctionnel
Ajout visible : la flèche décale le contenu de ces quatre pages d'environ
48 px vers le bas.

---

## [CORRECTION-17] Demande enregistrée pour une autre banque que celle de l'auteur

| Champ        | Valeur |
|---|---|
| **Fichiers legacy concernés** | `introduire_demandes.html`, `modifier_demande.html` |
| **Fichiers corrigés**         | `components/demandes/DemandeForm.js` (prop `userBanque`), `IntroduireDemandePage.js`, `ModifierDemandePage.js` |
| **Statut**                    | ✅ **Validé** — décision du 22/10/2026 (banque fixée, sans choix possible) |

### Description
Le champ « Banque » listait toutes les banques et présélectionnait la
première (AWA), comme le legacy. Une demande saisie sans changer ce choix
partait sur AWA : le validateur local de la filiale (qui ne voit que les
demandes de sa banque) ne la recevait jamais et elle restait bloquée à
l'étape 1. Constaté le 22/10/2026 : demande 23 de `introci` (BKCI)
enregistrée pour AWA, demande 20 pour BKSN.

### Correction appliquée
Le champ « Banque » est fixé sur la banque de l'utilisateur (profil
`GET /users-joined/`, sigle rapproché de `GET /banques/`), en création comme
en modification, et n'est plus modifiable (liste désactivée, toujours
affichée). Conforme aux conventions API v2 §3 (la banque est déduite du
token) et au document officiel (« la filiale saisit sa demande »). Modifier
une demande déjà enregistrée pour une autre banque la rattache à celle de
l'auteur. Si la banque du profil est absente de la liste, l'envoi est
bloqué avec un message.

Vérifié le 22/10/2026 : `introci` → BKCI (création et demande 23),
`introsn` → BKSN, aucune erreur JavaScript.

### Impact fonctionnel
Un utilisateur ne peut plus saisir une demande pour une autre banque que la
sienne. Le serveur ne le contrôle pas encore (point ouvert backend 14 :
`POST /demandes/` accepte toujours le paramètre `banque`).

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
- Bouton « Retour » retiré de la page détail. *Remplacé le 22/10/2026 par
  une petite flèche sur les pages détail, chat, modifier et valider
  (CORRECTION-16).*

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

### 2. Bibliothèques hébergées localement, versions figées
Plus aucune ressource chargée depuis un CDN (unpkg, jsdelivr, Google Fonts) :

| Bibliothèque | Avant | Après (`frontend/static/vendor/`) |
|---|---|---|
| Vue | `unpkg.com/vue@3` (version non figée, build de développement) | `vue/vue.esm-browser.prod.js` — **3.5.43** (version servie par `vue@3` au 13/10/2026), build de production |
| Bootstrap Icons | jsdelivr, 1.11.1 (8 pages) et 1.10.0 (index) | `bootstrap-icons/` — **1.11.1** partout (voir CORRECTION-13) |
| Bootstrap (index) | jsdelivr, 5.3.0 | `bootstrap/bootstrap.min.css` — 5.3.0 |
| Poppins (index) | Google Fonts | `poppins/poppins.css` + 15 fichiers woff2 (même `@font-face`, chemins relatifs) |

- Les paquets npm ont été vérifiés (empreinte sha512 du registre npm).
  Licences : `docs/licences/` (hors du dossier servi).
- Importmap des 11 pages : `"vue": "./static/vendor/vue/vue.esm-browser.prod.js"`.
  Les 26 modules importent désormais `from "vue"` (import nu résolu par
  l'importmap) au lieu de l'URL unpkg.
- Le build de production n'affiche plus les avertissements de
  développement de Vue dans la console ; le compilateur de templates reste
  inclus.
- **Mise à jour de Vue :** remplacer `vue.esm-browser.prod.js` par celui
  du paquet npm de la nouvelle version, puis contrôler les 11 pages.

### 3. CSS legacy allégé
Recensement des classes d'icônes dans les templates et des `font-family`
du CSS legacy :

| Police / feuille | Utilisée | Pages |
|---|---|---|
| feather | oui | 9 pages connectées (menu latéral, barre du haut, filtres) |
| ionicons | oui (`ion-md-menu`) | 9 pages connectées (bouton du menu latéral) |
| bootstrap-icons | oui | menu latéral, index, valider_demande |
| fontawesome, linearicons, open-iconic, pe-icon-7-stroke | non | — |
| flot.css (graphiques) | non | — |
| perfect-scrollbar.css (classes `.ps` posées par le JS legacy) | non | — |

- Retirés : les balises `<link>` et les fichiers des 4 polices et 2 feuilles
  inutilisées (`static/vendor/uikit/` : 4,1 Mo → 1,5 Mo). Seule la règle
  `.ui-builder` (non utilisée) de `shreerang-material.css` citait Linearicons.
- Blocs `<style>` dupliqués :
  - CSS du popup `#popup-nouvelle-demande` (8 pages) : supprimé, déjà dans
    `app.css` (sa règle `display:none` était écrasée par le
    `style="display:block"` du composant) ;
  - bloc `body` + `.chat-container` (7 pages) → `static/css/pages-demandes.css` ;
  - blocs d'acceuil et historique (cartes, boutons, tableaux, badges,
    recherche, `.compteur-demandes`) → `static/css/pages-tableau-bord.css`.
  Ces deux feuilles ne sont pas dans `app.css`, chargé par toutes les pages
  (le fond `body` diffère d'une page à l'autre) ; elles sont chargées à
  l'emplacement exact des anciens blocs (même ordre de cascade).
- Restent inline, car propres à une page : le bloc de `chat.html` et celui
  de `index.html`.

### 4. Durée de session alignée sur le serveur (changement de comportement)
Le jeton émis par `POST /login/` expire au bout de **30 min** ; le client
le considérait valide **1 h** (`TOKEN_TTL_MS`, `services/auth.js`). Entre
30 min et 1 h, les pages s'ouvraient puis chaque appel API recevait un 401
et renvoyait vers la connexion (CORRECTION-02). `TOKEN_TTL_MS` passe à
30 min : au-delà, la redirection vers `index.html` a lieu dès l'ouverture
de la page. Durée de session inchangée pour l'utilisateur ; voir aussi le
point ouvert backend 11.

---

## Passage à Tailwind (20/10/2026)

### Décision
Le CSS legacy (UIKit / Bootstrap 4 material, Bootstrap 5 pour la vitrine) est
remplacé par **Tailwind CSS via le Play CDN, version figée 3.4.17**, en
conservant à l'identique le design des pages legacy. Vue reste hébergé
localement (3.5.43). Le CDN Tailwind est la seule ressource externe.

### Méthode
- Styles réels relevés dans Chrome sur le legacy (couleurs, tailles, marges,
  polices, états au survol / focus), traduits en classes Tailwind.
- Legacy et version Tailwind servis côte à côte (même backend), captures
  comparées au pixel pour les 11 pages avec `testawa`, `testggr` et `introci`,
  ainsi que les onglets, modales, menu replié, menu utilisateur, survols et
  écrans de 1000, 800, 760, 560 et 400 px.
- Résultat : 0,00 % de pixels différents sur toutes les pages, sauf
  introduire_demandes (0,04 %) et valider_demande (0,01 %) : arrondis
  sous-pixel et anticrénelage, invisibles. Aucune erreur JavaScript.

### Fichiers
- Ajoutés : `static/js/tailwind.config.js` (couleurs, tailles de texte,
  points de rupture Bootstrap, animation du hero), `components/ui/classes.js`
  (boutons, tableaux, onglets, modales, champs, messages),
  `components/demandes/DemandesCard.js` et `TabsCard.js` (cartes communes),
  `static/vendor/tailwindcss/tailwindcss-play-3.4.17.js` (secours local).
- Supprimés : `static/css/` (`app.css`, `design.css`, `pages-*.css`),
  `static/vendor/uikit/css/`, `static/vendor/bootstrap/` (Bootstrap 5) et les
  blocs `<style>` inline (chat, vitrine). Polices d'icônes conservées.
- `ConfirmModal` / `InfoModal` : prop `variant` (« design » = coins arrondis
  et ombre des pages qui chargeaient `design.css` : validation GGR, modifier).

### Effets propres au Play CDN
- **Disponibilité** : si `cdn.tailwindcss.com` ne répond pas (constaté en
  test), la copie locale du même script est chargée ; rendu identique.
  Pour éviter une erreur JavaScript, `tailwind.config.js` ne s'applique que si
  le script est présent.
- **Défilement du chat** : le CSS est généré juste après l'insertion des
  messages ; le défilement vers le dernier message attend désormais que la
  zone ait sa hauteur fixe (ChatPage, `scrollToBottom`). Sans cela, le chat
  restait en haut de la conversation.
- **Transitions au chargement** : les éléments animés (flèches de
  l'accordéon des avis, par exemple) jouent leur transition une fois à
  l'ouverture de la page (≈ 0,3 s). Le legacy ne le faisait pas.
- **Console** : avertissement « cdn.tailwindcss.com should not be used in
  production », émis par le script Tailwind lui-même. Tailwind déconseille le
  Play CDN en production ; alternative sans Node : Tailwind CLI autonome
  générant un fichier CSS statique.

### Fidélité volontaire
Les défauts visuels du legacy sont reproduits (ex. message d'erreur
`alert-danger` en texte blanc sur fond rose pâle, titre vide de
modifier_demande, liens Login / Signup / FAQ du menu latéral).

### Impact fonctionnel
Aucun changement visible par l'utilisateur.

---

## Alignement sur les conventions API v2 (21/10/2026)

Contrat : `docs/conventions-api-v2.md` (statut « proposition », à valider par
le binôme back/front). Aucune route `/api/v2` n'existe encore : le frontend
applique dès maintenant ce qui ne dépend pas du backend.

### Appliqué
| § | Règle | Mise en œuvre |
|---|---|---|
| 5 | Erreurs affichables, sans information technique | `ApiError` dans `services/api.js` (CORRECTION-15) ; lit les formats v1 `{ detail }` et v2 `{ code, detail, champs }` |
| 5, 7 | 401 → effacer le token, connexion avec « session expirée » | `services/api.js`, `services/auth.js`, `LoginPage` (CORRECTION-14) |
| 7 | Un seul module d'appels, URL relatives à l'origine, en-tête `Authorization` | déjà le cas (`services/api.js`) |
| 8 | Téléchargement authentifié, jamais par un simple lien | `downloadNote()` : `fetch` avec le token → `blob` → nouvel onglet, adresse libérée ensuite (détail, valider, modifier) ; aspect inchangé |
| 8 | Fichiers joints : `.pdf`, `.jpg`, `.jpeg`, `.png`, 5 Mo maximum | `checkAttachment()` dans `DemandeForm` (création et modification) ; le backend appliquait déjà ces règles, le frontend n'acceptait que le PDF. Maintenu le 22/10/2026, bien que le résumé officiel (`Resume_Plateforme_Workflow_AWA`) indique encore « PDF » : document à mettre à jour |
| 7 | Menus selon le rôle = confort d'interface | déjà le cas (la sécurité dépend du serveur) |

Vérifié le 21/10/2026 (erreurs simulées dans le navigateur, sans écriture
en base) : 24 vérifications, dont 500, 404, 422 (v1 et v2), 409, panne
réseau, 401 et jeton périmé, téléchargement avec le token, fichiers PNG /
JPG / JPEG acceptés, TXT et PDF > 5 Mo refusés. Recette fonctionnelle
(27 parcours) inchangée. Aucun changement visuel hors messages d'erreur et
texte d'aide du champ fichier.

### Reste à faire (dépend du backend)
| Sujet | § | Bloqué par | Côté frontend, le moment venu |
|---|---|---|---|
| Routes `/api/v2` (tableau du §12) | 3, 12 | aucune route v2 livrée | migrer écran par écran ; une page ne mélange pas v1 et v2 |
| Session : token 35 min, 30 min d'inactivité, 10 h max, renouvellement, clé `derniereActivite` | 7 | `POST /api/refresh-token/` absent | suivi d'activité partagé entre onglets, renouvellement au plus une fois par minute ; aujourd'hui durée fixe de 30 min (sans renouvellement, une règle d'inactivité n'aurait aucun effet) |
| Identité envoyée par le front : `id_user` (introduire, modifier), `domaine` (accueil), `id_valideur`, `id_niveauValidation` (introduire), paramètres de `valider_avis` (valider) | 3 | routes v1 qui les exigent | les retirer avec chaque route v2 (identité déduite du token) |
| Listes paginées `{ items, total, page, taille }`, tri, filtres serveur, `vue=` | 4, 9 | réponses v1 `{ results }` non paginées | adapter `DemandesTable` / filtres (aujourd'hui filtrage côté client) |
| Montants en chaîne décimale, date-heure ISO unique, statuts `{ code, libelle }` | 6 | réponses v1 | adapter l'affichage (`formatNumber`, colonnes Date / Heure, libellés) ; règle aussi le point ouvert 10 |
| `actions_possibles` | 11 | réponses v1 | afficher les boutons selon ce champ au lieu des règles du menu |
| Téléchargement par `GET /api/v2/demandes/{id}/note-analyse` | 8 | route v2 ; `/api/download/` sans authentification (point ouvert 13) | changer l'URL dans `downloadNote()` (le mécanisme est déjà en place) |
| Erreurs 403 / 404 / 409 avec `code` stable | 5 | réponses v2 | tester `code` (jamais le texte) là où un comportement en dépend |

### Remarques sur le document, à trancher par le binôme
- §7 renvoie au comportement de `frontend/js/design.js` : le `design.js`
  legacy (tag `pre-bascule-vue`) ne contient ni `derniereActivite` ni
  renouvellement de token. Référence à corriger.
- §1 désigne `/workflow` comme « l'ancien front » ; le frontend Vue 3 +
  Tailwind est lui-même servi sous `/workflow`. Préciser l'adresse du
  « nouveau front » visé.
- §3 « pas de slash final » : les routes v1 en ont un ; règle à appliquer aux
  seules routes v2.

---

## À confirmer

Choix fonctionnels tranchés au plus près du legacy pendant la migration ;
à valider par le chef de projet.

1. ✅ **Résolu le 22/10/2026 — Comptes du jeu de test et menus.** Le document
   officiel `Resume_Plateforme_Workflow_AWA` (§2) confirme la logique du menu :
   **Niveau 1** = consultation (Accueil, Statistiques), **Niveau 2** = saisie
   (Introduire, Consulter mes demandes), **Niveau 3** = validation (Valider des
   demandes — version GGR pour AIG / GGR —, Historique), y compris la
   validation locale des filiales. C'est le jeu de test qui était faux : il
   décrivait le Niveau 1 comme « Saisie » et le Niveau 2 comme « Validateur
   local », et plaçait `introci` / `introsn` au Niveau 1, `risqueci` / `dgci`
   au Niveau 2. Corrigé : `introci` / `introsn` au Niveau 2, `risqueci` /
   `dgci` au Niveau 3, libellés des niveaux alignés sur le document
   (`dev/seed_test_data.sql` ; base locale mise à jour par
   `dev/fix_niveaux_comptes_2026-10-22.sql`). La validation locale (risque
   local, DG local, fenêtre « OUI/NON » du DG) est désormais testable avec
   `risqueci` et `dgci`. Aucun changement du code de l'application.
   Complété le même jour par `dev/seed_test_comptes_2026-10-22.sql` : un
   compte par étape du circuit (`risqueci` passe à l'entité GGR pour l'étape 1 ;
   nouveaux comptes `consultci` (Niveau 1), `risquesn`, `dgsn`, `regcib`,
   `regcdcf`, entités AIG « CIB » et « CDCF »).
2. **Demande sans avis initial (introduire_demandes).** Comme dans le legacy,
   la demande puis l'avis initial sont créés en deux appels. Si le second
   échoue, la demande existe sans avis et n'apparaît dans aucune liste.
   L'erreur est désormais affichée ; un endpoint unique côté backend
   éviterait ce cas.
3. **Lien actif du menu (toutes les pages).** Comme dans le legacy, « Accueil »
   reste en surbrillance sur toutes les pages et le sous-menu (« Menu » ou
   « Actions ») est fermé au chargement. À trancher : mettre en surbrillance la page courante
   et ouvrir le sous-menu qui la contient.
4. **Icône « Statistiques » du menu latéral (`bi-bar-chart`).** Elle est
   invisible sur acceuil, chat, demandes_validation et historique : ces
   pages ne chargent pas Bootstrap Icons, comme leur version legacy.
   Laissée telle quelle (aucun changement visuel, 13/10/2026). À trancher :
   charger `static/vendor/bootstrap-icons/bootstrap-icons.css` sur ces
   4 pages pour afficher l'icône partout.

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

**Mise à jour du 13/10/2026 :** `psycopg2-binary` figure désormais dans
`requirements.txt`, mais seuls `bcrypt` et `passlib` ont une version
figée. `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `pyjwt`,
`starlette`, `python-dotenv`, `jinja2`, `python-multipart` et `gunicorn`
s'installent dans leur dernière version : deux installations à des dates
différentes n'ont pas le même code. Recommandation : figer toutes les
versions (`==`), à partir de celles de l'environnement validé
(`pip freeze`), et les mettre à jour volontairement.

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

**Cause (analysée le 22/10/2026) :** dans `backend/routes/route.py`, route
`GET /demandes_a_consulter/{domaine_user}`, branche des filiales (banque
autre que AWA / AIG), la requête SQL utilise le paramètre `:user_id`
(sous-requête `WHERE id_valideur = :user_id`), mais le dictionnaire de
paramètres ne fournit que `id_banque`, `id_user` et `domaine`.

**Correctif proposé (une ligne, à appliquer par l'équipe backend)** :

```python
params = {"id_banque": user.id_banque, "id_user": user.id, "user_id": user.id, "domaine": domaine_user}
```

Décision du 22/10/2026 : le backend n'est pas modifié depuis ce dépôt ;
l'erreur reste affichée provisoirement (le frontend ne la masque pas).
Cible v2 : `GET /api/v2/demandes?vue=a-consulter` (conventions API v2 §12).

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

**Complément du 13/10/2026 :** Vue, Bootstrap Icons, Bootstrap et Poppins
sont désormais servis depuis `/workflow/static/vendor/` (voir « Améliorations
techniques », point 2) : l'absence de `Cache-Control` sur `/workflow/static/`
les concerne aussi.

### Point 9 — Routes mal formées et fonctions homonymes (`routes/route.py`)

- `GET /poste/poste_id}` et `GET /decision/decision_id}` : accolade ouvrante
  manquante. Le chemin est pris au pied de la lettre : ces routes sont
  inaccessibles (`GET /api/poste/3` et `GET /api/decision/3` répondent 405,
  vérifié le 13/10/2026). Corriger en
  `/poste/{poste_id}` et `/decision/{decision_id}`.
- Fonctions définies plusieurs fois sous le même nom : `create_demande`
  (`POST /demandes/` et `POST /update_demandes/{demande_id}`), `read_poste`,
  `update_poste`, `delete_avis` (avis, poste, décision),
  `get_demandes_a_valider`, `get_demandes_fin_process`, `get_demandes_user`.
  FastAPI enregistre chaque route au moment du décorateur, donc elles
  fonctionnent, mais le nom Python ne désigne que la dernière définition :
  identifiants d'opération en double dans `/docs`, code trompeur à la
  lecture, risque d'erreur lors d'une modification. Donner un nom unique à
  chaque fonction (par exemple `update_demande`, `read_decision`,
  `delete_poste`).

Le frontend n'utilise aucune de ces routes (seulement `GET /decisions/`, la liste).

### Point 10 — Date / heure du dernier avis : `MAX(date)` et `MAX(heure)` séparés

Une vingtaine de requêtes de `routes/route.py` calculent la date du dernier
avis d'une demande par `(MAX(date) || ' ' || MAX(heure))`, ou renvoient
`MAX(date)` et `MAX(heure)` dans deux colonnes. Les deux maximums sont
calculés indépendamment : ils peuvent venir de **deux avis différents**.
Exemple : avis du 03/10 à 16:45 puis avis du 05/10 à 09:10 → « 05/10
16:45 », un moment où aucun avis n'a été donné. Les colonnes « Date /
Heure » des tableaux et le tri par date sont touchés.

Recommandation : prendre la date et l'heure **de l'avis le plus récent**, par
exemple `MAX(date + heure)` (un seul horodatage), ou la ligne de l'avis
sélectionnée par `DISTINCT ON (id_demande) … ORDER BY id_demande, date DESC,
heure DESC`. Le frontend affiche les valeurs reçues sans les recombiner :
aucune modification n'est nécessaire de son côté.

### Point 11 — `auth.py` : paramètres du jeton dans le code

- La clé de signature des jetons et l'algorithme sont écrits en dur dans
  `backend/auth.py`, au lieu d'être lus depuis `backend/.env` (le projet
  utilise déjà `python-dotenv`). La clé est donc identique sur tous les
  environnements et visible par toute personne ayant accès au dépôt. La
  lire depuis l'environnement, la changer, et refuser le démarrage si elle
  est absente.
- `ACCESS_TOKEN_EXPIRE_MINUTES = 60` dans `auth.py`, mais la route
  `POST /login/` passe explicitement 30 minutes : la constante n'est jamais
  utilisée pour le login, et deux valeurs coexistent. Définir une seule
  durée, lue elle aussi depuis `.env`. Le frontend est aligné sur 30 min
  (« Améliorations techniques », point 4) : prévenir l'équipe frontend si
  la durée change.

### Point 12 — Pas de migrations de base de données

`backend/main.py` crée les tables au démarrage avec
`Base.metadata.create_all()`. Cette fonction crée les tables manquantes
mais ne modifie jamais une table existante (colonne ajoutée, renommée, type
changé) : chaque base doit être corrigée à la main et les environnements
divergent. Recommandation : adopter
**Alembic** (migrations versionnées avec le code), avec une première
migration qui reproduit le schéma actuel.

*(Points 9 à 12 identifiés lors de la revue technique du frontend — 13/10/2026)*

### Point 13 — `GET /api/download/{fichier}` sans authentification

La route de téléchargement des notes d'analyse ne vérifie pas le token :
quiconque connaît (ou devine) le nom d'un fichier peut le télécharger. Le
frontend envoie désormais le token (`downloadNote()`, conventions API v2
§8) : la route peut l'exiger sans changement côté frontend. Cible v2 :
`GET /api/v2/demandes/{id}/note-analyse` (le serveur vérifie que
l'utilisateur peut voir la demande).

*(Identifié lors de l'alignement sur les conventions API v2 — 21/10/2026)*

### Point 14 — Niveau d'habilitation non vérifié par le serveur

Le menu masque les pages selon le niveau (Niveau 1 = consultation,
Niveau 2 = saisie, Niveau 3 = validation ; document officiel
`Resume_Plateforme_Workflow_AWA` §2), mais le serveur ne vérifie pas ce
niveau. Constaté le 22/10/2026 : `GET /demandes_a_valider/` renvoie
2 demandes « à valider » à `introci` (Niveau 2, saisie), comme à `risqueci`
(Niveau 3) ; la route ne filtre que par banque et entité. Un utilisateur
peut donc ouvrir les pages par leur adresse et appeler l'API au-delà de son
niveau.

À traiter côté backend : contrôler le niveau (et la banque / l'étape) dans
les routes de lecture **et d'action** (`/valider_avis/…`,
`/cloturer_demande/…`, `/demandes/`, `/update_demandes/…`), avec `403`
pour une action interdite et `404` pour une ressource hors périmètre
(conventions API v2 §5 et §7 : le menu n'est qu'un confort d'interface).
Lié à la décision D3 (matrice des droits) et à `GET /api/v2/moi`
(permissions de l'utilisateur).

*(Identifié lors de la vérification des comptes de test — 22/10/2026)*

### Point 15 — Validation impossible pour un validateur de filiale hors entités GGR / DG

`POST /valider_avis/{id}/process_ongoing/{0|1}` choisit l'étape d'un
validateur de filiale d'après le libellé de son **entité** : `GGR` → statut 2,
`DG` → statut 3 (ou 9 si le DG arrête la demande). Pour toute autre entité,
`id_event` n'est jamais défini et la route plante (erreur 500). Or
`GET /demandes_a_valider/` présente l'étape 2 à **tout** utilisateur de filiale
dont l'entité n'est pas GGR : un tel utilisateur voit des demandes à évaluer
mais ne peut pas les valider (l'écran affiche « Erreur lors de la soumission
du formulaire. »). Constaté le 22/10/2026 avec `dgci` (poste Directeur
Général, entité Corporate) ; jeu de test corrigé par
`dev/fix_entite_dg_2026-10-22.sql` (entité « DG »).

À traiter côté backend : aligner les deux routes (même règle d'aiguillage)
et répondre `403` avec un message clair plutôt qu'une erreur 500
(conventions API v2 §5 et §7). À préciser par le métier : le DG local
est-il défini par son entité (règle actuelle du code) ou par son poste ?

*(Identifié lors du test de la validation DG local — 22/10/2026)*

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
