/**
 * components/layout/AppSidebar.js
 *
 * Menu latéral (Tailwind) — reprend le menu UIKit « layout-sidenav » du legacy :
 * mêmes libellés, mêmes icônes (polices feather / ionicons), mêmes dimensions.
 *
 * Comportements repris du JavaScript legacy (sidenav.js + demo.js), sans jQuery :
 *   - Sous-menu « Menu » : s'ouvre / se ferme au clic
 *   - Bouton ☰ : replie le menu (événement "toggle-collapse" géré par AppLayout)
 *   - Menu replié (compact) : 70 px, icônes centrées, sous-menu masqué ;
 *     se déploie au survol (événement "hover")
 *   - Liens masqués selon le niveau d'habilitation (user.menu, ex-infos_user())
 *   - Page courante en surbrillance (aria-current="page") et sous-menu qui la
 *     contient ouvert au chargement (lot G, feuille de route UI/UX, point 9 ;
 *     le legacy surlignait « Accueil » partout, sous-menu fermé). Pages d'une
 *     demande : valider → « Valider des demandes », modifier → « Consulter
 *     mes demandes » ; détail et chat n'ont pas d'entrée (plusieurs origines)
 *   - Liens « Login », « Signup », « FAQ » retirés (30/10/2026) : pages inexistantes,
 *     aucune utilité pour les utilisateurs authentifiés
 *   - Footer utilisateur : initiales (avatar) + nom complet + banque
 *
 * Props :
 *   compact   : affichage replié (icônes seules)
 *   collapsed : menu replié (même survolé) — passe au premier plan
 *   expanded  : menu ouvert en surimpression sur petit écran
 *   menuLabel : libellé de section — « Menu » sur la plupart des pages,
 *               « Actions » sur demandes_validation et chat.
 */

import { defineComponent, ref, computed } from "vue";
import { useCurrentUser } from "../../composables/useCurrentUser.js";

// Lien du menu (ex-.sidenav-link) et icône (ex-.sidenav-icon)
const LINK = "relative flex items-center w-full text-ink dark:text-[#cbd5e1] cursor-pointer transition-colors duration-150 hover:text-brand hover:bg-[#fff5f2] dark:hover:bg-white/5";
const ICON = "block shrink-0 text-[16px] leading-4 mr-1";
// Lien du sous-menu : décalé sous le libellé de section
const SUB_LINK = LINK + " py-[9px] pl-[56px] pr-[27.2px] text-[13px]";
const SUB_ICON = ICON + " w-[26px] text-[14px] opacity-70";
// Séparateur (ex-.sidenav-divider) : 24 px de marge de chaque côté
const DIVIDER = "self-stretch mx-6 border-t border-[rgba(33,37,41,0.075)] dark:border-white/10";
// Entrée de la page courante : fond doux, texte brand, barre gauche
const ACTIVE = " bg-[#fff5f2] dark:bg-orange-500/10 !text-brand before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-brand before:rounded-r-sm font-semibold";

/** Page → entrées du menu à mettre en surbrillance */
const ACTIVE_ITEMS = {
  "acceuil.html":                  ["accueil"],
  "introduire_demandes.html":      ["intro_dmd"],
  "consulter_demandes.html":       ["consult_dmd"],
  "modifier_demande.html":         ["consult_dmd"],
  "demandes_validation.html":      ["valid_dmd"],
  "ggrg_demandes_validation.html": ["valid_dmd_ggrg"],
  "valider_demande.html":          ["valid_dmd", "valid_dmd_ggrg"],
  "historique.html":               ["hist_dmd"],
  "statistiques.html":             ["stats_dmd"],
};

export default defineComponent({
  name: "AppSidebar",

  props: {
    compact:   { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    expanded:  { type: Boolean, default: false },
    menuLabel: { type: String,  default: "Menu" },
  },

  emits: ["toggle-collapse", "hover"],

  setup(props) {
    const user = useCurrentUser();
    const menu = user.menu;
    const actifs = ACTIVE_ITEMS[window.location.pathname.split("/").pop()] ?? [];
    const isActive = (item) => actifs.includes(item);
    // menuOpen : sous-menu ouvert sur les pages du sous-menu (non utilisé pour l'accordion
    // depuis la refonte label de section — conservé pour aria-expanded si besoin futur)
    const menuOpen = ref(actifs.some((item) => item !== "accueil"));

    /** Classes et aria-current d'une entrée */
    const sub = (item) => ({ class: SUB_LINK + (isActive(item) ? ACTIVE : ""), "aria-current": isActive(item) ? "page" : null });

    // Liens de premier niveau : icône centrée dans 70 px quand le menu est replié
    const link = computed(() => LINK + " py-3 " + (props.compact ? "pl-0 pr-[27.2px] whitespace-nowrap" : "px-[27.2px]"));
    const icon = computed(() => ICON + (props.compact ? " w-[70px] text-center" : " w-[28px]"));

    // Initiales pour l'avatar utilisateur
    const userInfo = computed(() => {
      const name = user.fullName.value;
      const banque = user.banque.value;
      if (!name && !banque) return null;
      const initials = name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
      return { name: name || "—", initials, banque };
    });

    return { menu, menuOpen, userInfo, link, icon, isActive, sub, ACTIVE, LINK, SUB_LINK, SUB_ICON, DIVIDER };
  },

  template: /* html */ `
    <div class="fixed top-0 left-0 flex flex-col h-screen bg-white dark:bg-[#16213e] overflow-hidden shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] transition-[width,transform,background-color] duration-200 lg:translate-x-0"
         :class="[compact ? 'w-[70px]' : 'w-[250px]', collapsed ? 'z-[1085]' : 'z-sidenav', expanded ? 'translate-x-0' : '-translate-x-full']"
         @mouseenter="$emit('hover', true)" @mouseleave="$emit('hover', false)">

        <!-- En-tête logo -->
        <div class="flex items-center shrink-0 h-[70px] min-h-px overflow-hidden bg-chrome leading-[14.304px]"
             :class="compact ? 'px-0' : 'px-[23.2px]'">
            <span class="block shrink-0 w-[36px] h-[29px] overflow-hidden" :class="{ 'mx-[17px]': compact }">
              <img src="images/sib_logo.PNG" alt="Brand Logo" class="block w-[36px] h-[29px]">
            </span>
            <a href="acceuil.html" class="block ml-2 text-white font-semibold tracking-wide whitespace-nowrap text-[13px]">WORKFLOW · AWA</a>
            <button type="button" class="block ml-auto text-white text-[21.456px] leading-[21.456px]"
                    aria-label="Afficher ou replier le menu"
                    @click="$emit('toggle-collapse')">
                <i class="ion ion-md-menu align-middle [&::before]:align-baseline" aria-hidden="true"></i>
            </button>
        </div>

        <!-- Navigation principale -->
        <ul class="flex flex-col items-start flex-auto m-0 pt-3 pb-1 overflow-y-auto overflow-x-hidden list-none [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#ccc_transparent]">

            <!-- Accueil -->
            <li class="w-full">
                <a href="acceuil.html" :class="link + (isActive('accueil') ? ACTIVE : '')"
                   :aria-current="isActive('accueil') ? 'page' : null">
                    <i :class="'feather icon-home ' + icon"></i>
                    <span>Accueil</span>
                </a>
            </li>

            <!-- Séparateur + label de section (masqué en mode compact) -->
            <li :class="DIVIDER + ' mt-3 mb-1'"></li>
            <li v-if="!compact" class="w-full px-[27.2px] pt-3 pb-1">
                <span class="text-[10px] tracking-widest uppercase text-muted font-semibold select-none">
                    {{ menuLabel }}
                </span>
            </li>

            <!-- Sous-menu : visible sauf en mode compact (hover → sidebar 250px → visible) -->
            <ul v-show="!compact" class="flex flex-col w-full m-0 py-1 list-none">
                <li v-if="menu.intro_dmd" id="intro_dmd" class="w-full">
                  <a href="introduire_demandes.html" v-bind="sub('intro_dmd')">
                    <i :class="'feather icon-edit-2 ' + SUB_ICON"></i>
                    <span>Introduire demande</span>
                  </a>
                </li>
                <li v-if="menu.consult_dmd" id="consult_dmd" class="w-full">
                  <a href="consulter_demandes.html" v-bind="sub('consult_dmd')">
                    <i :class="'feather icon-layers ' + SUB_ICON"></i>
                    <span>Mes demandes</span>
                  </a>
                </li>
                <li v-if="menu.valid_dmd" id="valid_dmd" class="w-full">
                    <a href="demandes_validation.html" v-bind="sub('valid_dmd')">
                      <i :class="'feather icon-check-circle ' + SUB_ICON"></i>
                      <span>Valider des demandes</span>
                    </a>
                </li>
                <li v-if="menu.valid_dmd_ggrg" id="valid_dmd_ggrg" class="w-full">
                    <a href="ggrg_demandes_validation.html" v-bind="sub('valid_dmd_ggrg')">
                      <i :class="'feather icon-check-circle ' + SUB_ICON"></i>
                      <span>Valider des demandes</span>
                    </a>
                </li>
                <li v-if="menu.stats_dmd" id="stats_dmd" class="w-full">
                    <a href="statistiques.html" v-bind="sub('stats_dmd')">
                      <i :class="'bi bi-bar-chart-line ' + SUB_ICON"></i>
                      <span>Statistiques</span>
                    </a>
                </li>
                <li v-if="menu.hist_dmd" id="hist_dmd" class="w-full">
                    <a href="historique.html" v-bind="sub('hist_dmd')">
                      <i :class="'feather icon-clock ' + SUB_ICON"></i>
                      <span>Historique</span>
                    </a>
                </li>
            </ul>

            <!-- Footer utilisateur (pousse vers le bas) -->
            <li class="mt-auto w-full">
                <div :class="DIVIDER + ' mb-0'"></div>
                <div v-if="userInfo" class="flex items-center gap-3 py-4"
                     :class="compact ? 'px-0 justify-center' : 'px-[27.2px]'">
                    <div class="shrink-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-[11px] font-bold leading-none select-none">
                        {{ userInfo.initials }}
                    </div>
                    <div v-if="!compact" class="overflow-hidden min-w-0">
                        <div class="text-[13px] font-semibold text-ink dark:text-[#e2e8f0] truncate leading-tight">{{ userInfo.name }}</div>
                        <div class="text-[11px] text-muted truncate leading-tight mt-[1px]">{{ userInfo.banque }}</div>
                    </div>
                </div>
            </li>
        </ul>
    </div>
  `,
});
