# Tests de recette du frontend

Tests automatiques de l'application dans un vrai navigateur (Playwright +
pytest). Ils parcourent les pages avec les comptes de test, comme un
utilisateur, et vérifient en plus, à chaque test : **aucune erreur
JavaScript** et **aucune fenêtre du navigateur** (`alert`, `confirm`).

**Ils ne modifient aucune donnée.** Les cas d'erreur (serveur injoignable,
fichier introuvable…) et les actions qui écriraient en base (suppression,
clôture, avis) sont simulés en interceptant les appels réseau dans le
navigateur : la requête n'atteint jamais le serveur. Un test dont les
données manquent (par exemple aucune demande à valider) est **ignoré**
(`SKIPPED`), pas en échec.

Base locale uniquement : ne jamais lancer ces tests sur la production.

## Contenu

| Fichier | Ce qui est vérifié |
|---|---|
| `test_connexion.py` | Alerte du formulaire (disparaît après 5 s), identifiants invalides, message « session expirée » (CORRECTION-14) |
| `test_pages.py` | Les 11 pages s'affichent pour les comptes concernés ; banque fixée sur celle de l'utilisateur (CORRECTION-17) ; états « Terme » / « Arrêté » ; 5 filtres de l'accueil et de l'historique |
| `test_erreurs.py` | Erreurs affichées dans la page : suppression, clôture, note d'analyse, envoi d'un avis ; × de la fenêtre du DG (CORRECTION-18) |
| `test_clavier.py` | Zoom autorisé sur les 11 pages ; fenêtres : focus, Tab, Échap (qui n'envoie jamais rien) — lot C |
| `test_lot_f.py` | Lot F (feuille de route UI/UX, niveau 1) : lignes « Chargement… » / « Aucune demande », montants formatés, chat vide, onglets et accordéon au clavier, note d'analyse sans doublon |
| `conftest.py`, `outils.py` | Navigateur, connexion des comptes, interceptions réseau |

## Prérequis

1. **Base locale** peuplée, dans cet ordre :
   `dev/seed_test_data.sql`, `dev/seed_test_extra.sql`,
   `dev/fix_niveaux_comptes_2026-10-22.sql`,
   `dev/seed_test_comptes_2026-10-22.sql`, `dev/fix_entite_dg_2026-10-22.sql`.
   Comptes utilisés : `introci`, `introsn`, `dgci`, `testggr`, `testawa`.
2. **Application lancée** (depuis la racine du dépôt) :
   `uvicorn backend.main:app --reload`
3. **Google Chrome installé** sur le poste : Playwright l'utilise
   directement, aucun navigateur n'est téléchargé.
4. **Python 3.10 ou plus**. Environnement dédié, à créer une fois
   (`.venv` est ignoré par git) :

   ```powershell
   python -m venv dev\tests\.venv
   dev\tests\.venv\Scripts\python -m pip install -r dev\tests\requirements.txt
   ```

## Lancer les tests

Le mot de passe des comptes de test se donne par une variable
d'environnement de la session, **jamais dans un fichier** :

```powershell
$env:WORKFLOW_TEST_PASSWORD = "<mot de passe des comptes de test>"
cd dev\tests
.venv\Scripts\python -m pytest            # tous les tests (≈ 4 min)
.venv\Scripts\python -m pytest test_erreurs.py          # un fichier
.venv\Scripts\python -m pytest -k "banque or dg" -v     # par nom
```

Variables facultatives :

| Variable | Défaut | Rôle |
|---|---|---|
| `WORKFLOW_URL` | `http://127.0.0.1:8000/workflow` | Adresse de l'application |
| `WORKFLOW_BROWSER` | `chrome` | Navigateur installé : `chrome` ou `msedge` |

Résultat attendu : tous les tests `passed` (quelques `skipped` si le jeu de
données ne contient pas le cas). Sans mot de passe ou sans application
lancée, pytest s'arrête tout de suite avec un message explicite.

## Règles pour ajouter un test

- Une correction ou un changement de comportement consigné dans
  `docs/CHANGELOG_REFACTORING.md` s'accompagne d'un test ici.
- Ne jamais écrire en base : intercepter l'appel (`couper`, `repondre_json`,
  `repondre_404`, `injecter_note`, `modifier_reponse`, `sans_reponse` dans `outils.py`).
- Ne pas dépendre d'un numéro de demande : le chercher (`premier_id`) ou
  cliquer sur la première ligne d'une liste, et `pytest.skip` si elle est vide.
