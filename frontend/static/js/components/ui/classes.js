/**
 * components/ui/classes.js
 *
 * Listes de classes Tailwind partagées par plusieurs composants, pour
 * reproduire le CSS legacy à un seul endroit (valeurs relevées sur les pages
 * legacy, voir static/js/tailwind.config.js).
 *
 * Le Play CDN génère le CSS à partir des classes présentes dans le DOM :
 * les classes peuvent donc être composées en JavaScript.
 */

// ---------------------------------------------------------------------------
// Boutons (ex-.btn de Bootstrap 4 material)
// ---------------------------------------------------------------------------

/** Base commune : texte 13 px en capitales, coins de 2 px, opacité 65 % si désactivé */
const BTN_BASE =
  "inline-block align-middle px-4 py-2 text-btn font-medium uppercase text-center whitespace-nowrap " +
  "border-0 rounded-[2px] cursor-pointer transition-all duration-200 ease-in-out " +
  "disabled:opacity-[.65] disabled:cursor-default";

/** Ombre « material » au repos, renforcée au survol et au focus */
const SHADOW = "shadow-[0_2px_4px_-1px_rgba(0,0,0,0.07),0_4px_5px_0_rgba(0,0,0,0.05),0_1px_10px_0_rgba(0,0,0,0.03)]";
const SHADOW_UP =
  "hover:shadow-[0_2px_4px_-1px_rgba(0,0,0,0.15),0_4px_5px_0_rgba(0,0,0,0.1),0_1px_10px_0_rgba(0,0,0,0.06)] " +
  "focus:shadow-[0_2px_4px_-1px_rgba(0,0,0,0.15),0_4px_5px_0_rgba(0,0,0,0.1),0_1px_10px_0_rgba(0,0,0,0.06)]";

/** Bouton plein (ex-.btn-primary, .btn-danger…) */
function solid(bg, hoverBg) {
  return `${BTN_BASE} text-white bg-[${bg}] hover:bg-[${hoverBg}] ${SHADOW} ${SHADOW_UP}`;
}

/** Bouton plein à halo coloré (ex-.btn-glow-*) : halo de 1 px, 3 px au survol, aucun au focus */
function glow(bg, hoverBg, rgb) {
  return `${BTN_BASE} text-white bg-[${bg}] hover:bg-[${hoverBg}] ` +
    `shadow-[0_1px_20px_1px_rgba(${rgb},0.6)] hover:shadow-[0_1px_20px_3px_rgba(${rgb},0.6)] ` +
    `focus:shadow-none disabled:${SHADOW}`;
}

export const BTN = {
  primary:        solid("#ff4a00", "#ff530d"),
  danger:         solid("#ff4961", "#ff5269"),
  dark:           solid("#606c72", "#687379"),
  secondary:      solid("#8897aa", "#8e9cae"),
  info:           solid("#55a3f4", "#5ea8f5"),
  default:        `${BTN_BASE} text-ink bg-white ${SHADOW} ${SHADOW_UP}`,
  outlinePrimary: `${BTN_BASE} text-[#ff4a00] bg-transparent shadow-[inset_0_0_0_1px_#ff4a00] ` +
                  `hover:text-white hover:bg-[#ff4a00] focus:text-white focus:bg-[#ff4a00] ${SHADOW_UP}`,

  glowWarning:    glow("#f4ab55", "#f5af5e", "244,171,85"),
  glowDanger:     glow("#ff4961", "#ff5269", "255,73,97"),
  glowSecondary:  glow("#8897aa", "#8e9cae", "136,151,170"),
  glowInfo:       glow("#55a3f4", "#5ea8f5", "85,163,244"),

  // Bouton orange à contour (accueil, historique : .btn-info redéfini par la page)
  outlineBrand:
    "inline-block align-middle px-[22px] py-[7px] text-btn font-semibold uppercase text-brand bg-white " +
    "border-2 border-brand rounded-[20px] shadow-[0_1px_4px_#ea580c11] cursor-pointer " +
    "transition-[background,color,box-shadow] duration-200 " +
    "hover:bg-brand hover:text-white hover:shadow-[0_4px_16px_#ea580c33]",
};

// ---------------------------------------------------------------------------
// Onglets (ex-.nav-tabs) : soulignement orange de 2 px sous l'onglet actif
// ---------------------------------------------------------------------------

const TAB_BASE =
  "block mr-[2px] px-[17px] py-3 text-btn font-medium uppercase rounded-t-[2px] " +
  "bg-[linear-gradient(#ff4a00,#ff4a00)] bg-no-repeat bg-[position:50%_100%]";

export const TAB = {
  active:   `${TAB_BASE} text-ink bg-[length:100%_2px] transition-[background] duration-300 ease-out`,
  inactive: `${TAB_BASE} text-[#8b888e] bg-[length:0_2px] hover:text-ink`,
};

// ---------------------------------------------------------------------------
// Tableaux de demandes (DemandesTable)
// ---------------------------------------------------------------------------

const TH = "p-[10px] first:pl-6 last:pr-6 border-b-2 border-[#f1f1f2] whitespace-nowrap align-bottom text-left font-bold";
const TD = "p-[10px] first:pl-6 last:pr-6 border-t border-line whitespace-nowrap align-middle";

export const TABLE = {
  // Accueil et historique : en-tête orange, lignes paires orangées
  dashboard: {
    table: "w-full bg-white rounded-[14px] overflow-hidden shadow-[0_2px_8px_#ea580c11] " +
           "max-[900px]:text-[0.97rem] max-[600px]:text-[0.85rem]",
    headRow: "bg-brand text-white font-bold",
    th: TH,
    row: "even:bg-brand-soft hover:bg-brand-row",
    td: TD,
  },
  // Autres pages : tableau simple, ligne grisée au survol
  demandes: {
    table: "w-full",
    headRow: "",
    th: TH,
    row: "hover:bg-[rgba(24,28,33,0.035)]",
    td: TD,
  },
};

/** Contenu des cellules (ex-classes legacy custom-control, media-body…) */
export const CELL = {
  cc:     "block relative pl-[43.008px] min-h-[18px] mb-0",
  label:  "inline-block mb-2",
  media:  "ml-4",
  self:   "ml-4",
  inline: "inline-block align-middle",
};

// ---------------------------------------------------------------------------
// Modales (ConfirmModal, InfoModal) — ex-.modal Bootstrap, centrées, 560 px
// ---------------------------------------------------------------------------

export const MODAL = {
  wrap:     "fixed inset-0 z-[1090] block overflow-hidden",
  dialog:   "relative flex items-center w-auto max-w-[560px] min-h-[calc(100%-56px)] my-[28px] mx-auto",
  // Ombre selon la page : « material » (CSS UIKit) ou « design » (pages qui chargeaient design.css)
  content: {
    material: "relative flex flex-col w-full bg-white shadow-[0_11px_15px_-7px_rgba(0,0,0,0.15),0_24px_38px_3px_rgba(0,0,0,0.1),0_9px_46px_8px_rgba(0,0,0,0.08)]",
    design:   "relative flex flex-col w-full bg-white rounded-[10px] shadow-[0_10px_20px_rgba(0,0,0,0.3),0_6px_6px_rgba(0,0,0,0.25)]",
  },
  header:   "relative flex items-start justify-between pt-5 pr-[41px] pb-0 pl-[25px] rounded-t-[2px]",
  title:    "m-0 text-[16px] font-medium leading-[1.47]",
  body:     "relative flex-auto p-[25px]",
  footer:   "flex items-center justify-end px-6 py-4 rounded-b-[2px]",
  // Boutons du pied : 4 px d'écart entre eux
  footBtn:  "[&:not(:first-child)]:ml-1 [&:not(:last-child)]:mr-1",
  backdrop: "fixed inset-0 z-[1089] bg-[#181c21] opacity-20",
};

// ---------------------------------------------------------------------------
// Champs de formulaire (ex-.form-control material) : soulignés, orange au focus
// ---------------------------------------------------------------------------

const FIELD_BASE =
  "block w-full min-h-[35px] px-0 pt-2 pb-[7px] text-[13px] text-ink bg-transparent rounded-none " +
  "placeholder:text-[#babbbc] " +
  "border-0 border-b border-[rgba(24,28,33,0.1)] outline-none transition-[border-color,box-shadow] duration-150 ease-in-out " +
  "focus:border-[#ff4a00] focus:shadow-[inset_0_-1px_0_0_#ff4a00]";

/** Zone de texte (2 lignes par défaut, redimensionnable en hauteur) */
export const TEXTAREA = `${FIELD_BASE} leading-[1.33] resize-y`;

export const FORM = {
  input:  `${FIELD_BASE} h-[35px] leading-[1.33]`,
  // Liste déroulante : apparence native du navigateur (flèche), interligne normal
  select: `${FIELD_BASE} h-[35px] leading-[normal]`,
  file:   `${FIELD_BASE} h-[35px] leading-[1.33] whitespace-pre cursor-default`,
  group:  "mb-4",                                                  // ex-.form-group
  label:  "inline-block mb-2 font-bold",                           // <label> en gras
  labelS: "inline-block text-[13.3px] leading-[1.47] font-bold",   // ex-label.form-label
  help:   "block mt-1 text-sm",                                    // ex-small.form-text
  // Groupe « XOF » + montant (ex-.input-group)
  inputGroup: "relative flex items-stretch w-full",
  addon:  "flex items-center px-[14px] pt-2 pb-[7px] leading-[19.0243px] text-center whitespace-nowrap " +
          "border-b border-[rgba(24,28,33,0.1)]",
  groupInput: `${FIELD_BASE} relative flex-auto w-[1%] min-w-0 h-[35px] pl-[14px] leading-[1.33]`,
};

/** Carte de formulaire (ex-.card + .card-header + .card-body) */
export const CARD = {
  card:   "relative flex flex-col bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)]",
  header: "block m-0 px-6 py-[20.8px] text-h4 font-bold leading-[1.54] border-b border-line rounded-t-[2px]",
  body:   "p-6",
};

// ---------------------------------------------------------------------------
// Fiche « libellé / valeur » (détail d'une demande, avis) — ex-table.card-table
// ---------------------------------------------------------------------------

export const SHEET = {
  table: "w-full",
  th:    "p-[10px] first:pl-6 last:pr-6 border-b-2 border-[#f1f1f2] whitespace-nowrap align-bottom text-left font-medium",
  td:    "p-[10px] first:pl-6 last:pr-6 border-t border-line whitespace-nowrap align-top",
  cell:  "block ml-4",                          // ex-.media-body.align-self-center.ml-3
  label: "font-black",                          // <strong>
  value: "block m-0 font-medium leading-[1.1]", // ex-h6.mb-0
};

// ---------------------------------------------------------------------------
// Messages et liens
// ---------------------------------------------------------------------------

/** Message d'erreur (ex-.alert.alert-danger : texte blanc sur fond rose, comme le legacy) */
const ALERT_DANGER_BASE = "relative block p-4 text-white bg-[#ffe4e7] border border-[#f0d6d9] rounded-[2px]";
export const ALERT_DANGER      = `${ALERT_DANGER_BASE} my-4`;   // .alert.mt-3
export const ALERT_DANGER_FORM = `${ALERT_DANGER_BASE} mb-4`;   // .alert seul (formulaires)
/** Message de succès (ex-.alert.alert-success : texte blanc sur fond vert pâle, comme le legacy) */
export const ALERT_SUCCESS_FORM = "relative block mb-4 p-4 text-white bg-[#e7f9ef] border border-[#d9eae1] rounded-[2px]";

/** Lien (couleur des liens du CSS legacy) */
export const LINK = "text-[#ff4a00] hover:text-[#b33400]";
