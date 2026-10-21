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

Open `http://127.0.0.1:8000/workflow/index.html` (login), then `http://127.0.0.1:8000/workflow/<page>.html`.
Do **not** use `python -m http.server 5500`: different origin, so API calls fail (CORS).

API docs at `http://127.0.0.1:8000/docs`.

## Technical constraints (strict)

- **Vue 3 hosted locally** — `frontend/static/vendor/vue/vue.esm-browser.prod.js` (3.5.43, mapped to `"vue"` by
  each page's importmap); modules import `from "vue"`. No CDN (unpkg, jsdelivr, Google Fonts…), no Node.js,
  npm, Vite, Webpack, React, or any build tool
- **ES6 native modules** — components live in separate `.js` files, imported with `type="module"`
- **Legacy CSS, no Tailwind** — the UI must look exactly like the legacy pages (decision of 08/10/2026).
  Each page `<head>` reuses its legacy stylesheets and `<style>` blocks (blocks shared by several pages live in
  `static/css/pages-*.css`, linked at the block's original position; page-specific ones stay inline; unused
  icon fonts are removed: check `font-family` and icon classes before re-adding one); templates reproduce the
  legacy markup (UIKit / Bootstrap 4 material classes). No legacy JavaScript (jQuery, Bootstrap JS): its
  runtime behaviour is reimplemented in Vue, plus `frontend/static/css/app.css`
- Page components in `frontend/static/js/pages/`, reusable components in `frontend/static/js/components/`

## Frontend rules

- `API_URL` toujours relative à `window.location.origin` — utiliser `` `${window.location.origin}/api` ``, jamais d'URL en dur (ni Render, ni `127.0.0.1`)
- Migration complete (bascule finale du 05/10/2026): every page is Vue 3; the legacy HTML is only in git tag `pre-bascule-vue`
- No `v-html`; if ever unavoidable, content must go through `escapeHtml()` first
- Any visual change must keep the legacy look; compare with the legacy page from tag `pre-bascule-vue`
- Links and downloads use Vue `:href` bindings, never `document.getElementById(...).href`
- Record every behavior change in `docs/CHANGELOG_REFACTORING.md`
- `frontend/` is served publicly under `/workflow`: put only browser files there (no .md, .txt, .sql,
  backups); documentation goes in `docs/`
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
docs/
  CHANGELOG_REFACTORING.md         # Behavior changes vs legacy, open points (not served)
  licences/                        # Licences of the vendored libraries
frontend/                          # Served as-is under /workflow (browser files only)
  *.html                           # One shell per page: legacy <head> (stylesheets + inline <style>),
                                   # importmap, mounts static/js/pages/<Page>.js on #app
    index.html                     #   LoginPage — legacy showcase page with login section
    acceuil.html                   #   AccueilPage — dashboard
    introduire_demandes.html       #   IntroduireDemandePage
    modifier_demande.html          #   ModifierDemandePage (?id_dmd=)
    consulter_demandes.html        #   ConsulterDemandesPage
    detail_consulter_demande.html  #   DetailDemandePage (?id_dmd=)
    chat.html                      #   ChatPage (?id_dmd=)
    demandes_validation.html       #   DemandesValidationPage
    valider_demande.html           #   ValiderDemandePage (?id_dmd=)
    ggrg_demandes_validation.html  #   GgrgValidationPage
    historique.html                #   HistoriquePage
  images/                          # sib_logo.PNG, avatar.png
  static/
    vendor/vue/                    # vue.esm-browser.prod.js 3.5.43 (npm package, licence in docs/licences/)
    vendor/uikit/                  # Legacy CSS (bootstrap-material, shreerang-material, uikit) + the only
                                   # icon fonts in use: feather, ionicons
    vendor/bootstrap-icons/        # Bootstrap Icons 1.11.1 (css + fonts)
    vendor/bootstrap/              # Bootstrap 5.3.0 CSS (index.html only)
    vendor/poppins/                # Poppins font, local @font-face (index.html only)
    css/design.css                 # Legacy design.css (modal shadow)
    css/pages-demandes.css         # Legacy <style> shared by 7 pages (body, .chat-container)
    css/pages-tableau-bord.css     # Legacy <style> shared by acceuil + historique (cards, tables…)
    css/app.css                    # What legacy JS did at runtime: popup, modals, sidebar, scroll areas
    js/
      services/
        api.js                     # fetch wrapper with Bearer token, 401 → index.html
        auth.js                    # login, logout (redirects to index.html), token storage
        chatSeen.js                # lastMsg_{id} — "Nouveau" chat badge (Accueil / Chat)
      composables/
        useCurrentUser.js          # profile + sidebar menu flags
        useNotificationPolling.js  # "Nouvelle demande à valider" popup
      components/
        layout/                    # AppLayout (legacy layout-wrapper), AppSidebar, AppNavbar,
                                   # AppFooter, NotificationPopup
        demandes/                  # StatCard, DemandeFilters, DemandesTable (+ ActionCell),
                                   # AvisTimeline, DemandeForm
        ui/                        # ConfirmModal, InfoModal
      pages/                       # One file per page: AccueilPage.js, etc.
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
