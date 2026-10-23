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
  each page's importmap); modules import `from "vue"`. No Node.js, npm, Vite, Webpack, React, or any build tool
- **ES6 native modules** — components live in separate `.js` files, imported with `type="module"`
- **Tailwind via the Play CDN, version pinned to 3.4.17** (decision of 20/10/2026) — the only CDN allowed.
  Every page `<head>` loads `https://cdn.tailwindcss.com/3.4.17`, then a local fallback of the same script
  (`static/vendor/tailwindcss/tailwindcss-play-3.4.17.js`, written only if `window.tailwind` is missing), then
  `static/js/tailwind.config.js`. Copy the `<head>` of an existing page; never use `cdn.tailwindcss.com` without a
  version
- **Legacy look, in Tailwind classes** — the UI must look exactly like the legacy pages (pixel comparison).
  No CSS file of our own: styles are Tailwind classes in the templates. Shared values live in
  `static/js/tailwind.config.js` (colours, Bootstrap breakpoints 576/768/992/1200/1400, legacy font sizes) and
  shared class lists in `static/js/components/ui/classes.js` (buttons, tables, tabs, modals, form fields,
  alerts). Caution: `text-base` is the legacy body size (14.304px) — use `text-[1rem]` for 16px (index.html).
  The Play CDN builds CSS from the classes present in the DOM, so classes may be composed in JavaScript.
  Only the icon fonts in use are loaded (feather, ionicons, bootstrap-icons): check icon classes before
  re-adding one. No legacy JavaScript (jQuery, Bootstrap JS): its runtime behaviour is reimplemented in Vue
- Page components in `frontend/static/js/pages/`, reusable components in `frontend/static/js/components/`

## Frontend rules

- `API_URL` toujours relative à `window.location.origin` — utiliser `` `${window.location.origin}/api` ``, jamais d'URL en dur (ni Render, ni `127.0.0.1`)
- Migration complete (bascule finale du 05/10/2026): every page is Vue 3; the legacy HTML is only in git tag `pre-bascule-vue`
- No `v-html`; if ever unavoidable, content must go through `escapeHtml()` first
- Any visual change must keep the legacy look; compare with the legacy page from tag `pre-bascule-vue`
- **API contract: `docs/conventions-api-v2.md`** (proposal shared with the backend team). What the frontend
  already applies and what waits for the backend is tracked in `docs/CHANGELOG_REFACTORING.md`
  (« Alignement sur les conventions API v2 »)
- All API calls go through `services/api.js`. Errors are `ApiError` objects whose `message` is safe to show;
  never display technical details (route, HTTP code, SQL) to users
- Links use Vue `:href` bindings, never `document.getElementById(...).href`. File downloads go through
  `downloadNote()` (authenticated fetch + blob), never a plain link (a link does not send the token)
- Attachments: `.pdf`, `.jpg`, `.jpeg`, `.png`, 5 MB max (`checkAttachment()`), same rules as the backend
- Record every behavior change in `docs/CHANGELOG_REFACTORING.md`
- `frontend/` is served publicly under `/workflow`: put only browser files there (no .md, .txt, .sql,
  backups); documentation goes in `docs/`
- Propose a plan before any significant change
- The `.html` pages stay at the root of `frontend/` (their URLs and users' bookmarks depend on it). Any
  reorganisation of the pages (sub-folders, URLs without `.html`) will be done together with backend open
  point 8 (clean URLs, `docs/CHANGELOG_REFACTORING.md`), never before

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
  conventions-api-v2.md            # API v2 contract between backend and frontend (proposal)
  licences/                        # Licences of the vendored libraries (Vue, Tailwind, Bootstrap Icons, Poppins)
frontend/                          # Served as-is under /workflow (browser files only)
  *.html                           # One shell per page: icon fonts, Tailwind (CDN + fallback + config),
                                   # importmap, <body> classes (background, font), mounts
                                   # static/js/pages/<Page>.js on #app
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
    vendor/tailwindcss/            # Play CDN script 3.4.17 — local fallback if the CDN does not answer
    vendor/uikit/fonts/            # Icon fonts in use: feather, ionicons (legacy UIKit files)
    vendor/bootstrap-icons/        # Bootstrap Icons 1.11.1 (css + fonts)
    vendor/poppins/                # Poppins font, local @font-face (index.html only)
    js/
      tailwind.config.js           # Shared Tailwind config: legacy colours, font sizes, breakpoints
      services/
        api.js                     # fetch wrapper with Bearer token, ApiError (user-facing messages),
                                   # 401 → index.html « session expirée », downloadNote(), checkAttachment()
        auth.js                    # login, logout (redirects to index.html), token storage
        chatSeen.js                # lastMsg_{id} — "Nouveau" chat badge (Accueil / Chat)
      composables/
        useCurrentUser.js          # profile + sidebar menu flags
        useNotificationPolling.js  # "Nouvelle demande à valider" popup
        useTimedAlert.js           # in-page alert that disappears after 5 s
      domain/
        workflow.js                # EVENT status codes (1–9), PROCESS (DG continue / stop)
      utils/
        url.js                     # readDemandeId() — ?id_dmd= parameter
      components/
        layout/                    # AppLayout (legacy layout-wrapper), AppSidebar, AppNavbar,
                                   # AppFooter, NotificationPopup
        demandes/                  # StatCard, DemandeFilters, DemandesTable (+ ActionCell, themes
                                   # "dashboard" / "demandes"), DemandesCard, TabsCard,
                                   # AvisTimeline, DemandeForm
        ui/                        # ConfirmModal, InfoModal (variant "material" / "design"),
                                   # BackArrow (back arrow on detail / chat / modifier / valider),
                                   # classes.js (shared Tailwind class lists)
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
