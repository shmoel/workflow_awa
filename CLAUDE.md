# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This repo handles **frontend refactoring only**. The backend FastAPI (`backend/`) is maintained by a separate team — do not modify it. Adapt to existing endpoints; if a new backend field/table appears, update the frontend to consume it.

## Running the frontend locally

The frontend is served by FastAPI (`/workflow`, same origin as `/api`):

```bash
# From repo root (activate AWA_W1 venv first)
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/workflow/<page>.html` (legacy) or `http://127.0.0.1:8000/workflow/<page>_vue.html` (refactored).
Do **not** use `python -m http.server 5500`: different origin, so API calls fail (CORS).

API docs at `http://127.0.0.1:8000/docs`.

## Technical constraints (strict)

- **Vue 3 via CDN** — no Node.js, npm, Vite, Webpack, React, or any build tool
- **ES6 native modules** — components live in separate `.js` files, imported with `type="module"`
- **Tailwind CSS via CDN** — color tokens defined in `frontend/static/css/tokens.css`
- Page components in `frontend/static/js/pages/`, reusable components in `frontend/static/js/components/`

## Migration rules

- `API_URL` toujours relative à `window.location.origin` — utiliser `` `${window.location.origin}/api` ``, jamais d'URL en dur (ni Render, ni `127.0.0.1`)
- One page migrated at a time; result is a `*_vue.html` file alongside the legacy `.html`
- All `v-html` bindings must pass content through `escapeHtml()` first
- Links and downloads use Vue `:href` bindings, never `document.getElementById(...).href`
- Update `CHANGELOG_REFACTORING.md` after completing each page migration
- Propose a plan before any significant change

## Domain: Workflow AWA (demandes CIB / CDCF)

Centralisation et validation des demandes d'autorisation d'opérations bancaires (CIB AWA).

**Validation circuit** (in order):

1. Introduction (subsidiary submits)
2. Risque_Local (local risk officer)
3. DG_Local (local general director)
4. Central (group central — AWA)
5. Groupe_Region (regional department — AIG)
6. GGR (final level — risk at AIG)

`Entite` = business units (Salle des marchés, Corporate, etc.), **not** a geographic hierarchy.

**Demande lifecycle** — current status = `MAX(id_event)` across `avis` rows for that demande:

| `id_event` | Meaning |
|---|---|
| 1 | Submitted / pending first review |
| 2 | Validated at subsidiary (Risque_Local) |
| 3 | Awaiting group central (AWA) |
| 4 | Awaiting regional department (AIG) |
| 5 | Awaiting GGR |
| 6 | Approved (circuit complete, after GGR) |
| 7–9 | Final / closed states |

**Workflow routing** — what a user sees depends on `banque.sigle` + `entite.libelle`:

- `AWA` — group central; sees all demandes from all banks
- `AIG` — regional; sees its bank network; `entite = GGR` routes to `id_event = 5`, others to `id_event = 4`
- Other sigles — subsidiaries; see only their own bank's demandes

## Frontend architecture

```
frontend/
  index.html, index_.html          # Login pages
  acceuil.html / acceuil_vue.html  # Dashboard (legacy / refactored)
  *_vue.html                       # Refactored pages (Vue 3)
  *.html                           # Legacy pages (plain HTML + inline JS)
  static/
    css/tokens.css                 # Tailwind color tokens
    js/
      services/
        auth.js                    # Token storage, logout (redirects to index.html)
        api.js                     # fetch wrapper with Bearer token
      composables/
        useCurrentUser.js
        useNotificationPolling.js
      components/
        layout/                    # AppNavbar, AppSidebar, AppFooter
        demandes/                  # StatCard, DemandeFilters, DemandesTable
        ui/                        # ConfirmModal
      pages/                       # One file per page: AccueilPage.js, etc.
  assets/assets_index/             # Bootstrap, AOS, vendor libs, images
```

## Data model (for reference)

```
Localisation → Banque → Users → Demandes → Avis
DepartementGroup → CategorieDemande → TypeDemande → Demandes
NiveauHab, Entite, Poste → Users
Domaine ←→ Users  (UserDomaine junction)
EventStatut, Decision, NiveauValidation → Avis
```

File uploads (notes d'analyse): `GET /api/download/{filename}` — files are stored on the server with prefix `YYYYMMDD_HHMMSS_`.
