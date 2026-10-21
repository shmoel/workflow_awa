/**
 * components/layout/AppSidebar.js
 *
 * Menu latéral (Tailwind) — reprend le menu UIKit « layout-sidenav » du legacy :
 * mêmes libellés, mêmes icônes (polices feather / ionicons), mêmes dimensions.
 *
 * Comportements repris du JavaScript legacy (sidenav.js + demo.js), sans jQuery :
 *   - Sous-menu « Menu » : fermé au chargement, s'ouvre / se ferme au clic
 *   - Bouton ☰ : replie le menu (événement "toggle-collapse" géré par AppLayout)
 *   - Menu replié (compact) : 70 px, icônes centrées, sous-menu masqué ;
 *     se déploie au survol (événement "hover")
 *   - Liens masqués selon le niveau d'habilitation (user.menu, ex-infos_user())
 *   - « Accueil » est en surbrillance sur toutes les pages, comme dans le
 *     legacy (balisage copié tel quel dans chaque page)
 *   - Liens « Login », « Signup », « FAQ » conservés comme dans le legacy
 *     (décision du 08/10/2026) : ils mènent à des pages inexistantes (404)
 *
 * Props :
 *   compact   : affichage replié (icônes seules)
 *   collapsed : menu replié (même survolé) — passe au premier plan
 *   expanded  : menu ouvert en surimpression sur petit écran
 *   menuLabel : libellé du sous-menu — « Menu » sur la plupart des pages legacy,
 *               « Actions » sur demandes_validation et chat. Sur ces deux pages,
 *               l'entrée « Statistiques » a aussi l'icône legacy « cadenas »
 *               (feather icon-lock) au lieu de bi-bar-chart.
 */

import { defineComponent, ref, computed } from "vue";
import { useCurrentUser } from "../../composables/useCurrentUser.js";

// Lien du menu (ex-.sidenav-link) et icône (ex-.sidenav-icon)
const LINK = "relative flex items-center w-full text-ink cursor-pointer transition-colors duration-200";
const ICON = "block shrink-0 text-[16px] leading-4 mr-1";
// Lien du sous-menu : décalé sous le libellé « Menu »
const SUB_LINK = LINK + " py-[10px] pl-[59.2px] pr-[27.2px]";
const SUB_ICON = ICON + " w-[28px]";
// Séparateur (ex-.sidenav-divider) : 30 px de marge de chaque côté
const DIVIDER = "self-stretch mx-[30px] border-t border-[rgba(33,37,41,0.075)]";

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
    // computed rangé dans un objet ordinaire : exposé directement pour que
    // le template le déballe
    const menu = user.menu;
    const menuOpen = ref(false);
    const statsIcon = computed(() =>
      props.menuLabel === "Actions" ? "feather icon-lock " + SUB_ICON : "bi bi-bar-chart block"
    );

    // Liens de premier niveau : icône centrée dans 70 px quand le menu est replié
    const link = computed(() => LINK + " py-3 " + (props.compact ? "pl-0 pr-[27.2px] whitespace-nowrap" : "px-[27.2px]"));
    const icon = computed(() => ICON + (props.compact ? " w-[70px] text-center" : " w-[28px]"));

    return { menu, menuOpen, statsIcon, link, icon, LINK, SUB_LINK, SUB_ICON, DIVIDER };
  },

  template: /* html */ `
    <div class="fixed top-0 left-0 flex flex-col h-screen bg-white overflow-hidden shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] transition-[width,transform] duration-200 lg:translate-x-0"
         :class="[compact ? 'w-[70px]' : 'w-[250px]', collapsed ? 'z-[1085]' : 'z-sidenav', expanded ? 'translate-x-0' : '-translate-x-full']"
         @mouseenter="$emit('hover', true)" @mouseleave="$emit('hover', false)">

        <div class="flex items-center shrink-0 h-[70px] min-h-px overflow-hidden bg-chrome leading-[14.304px]"
             :class="compact ? 'px-0' : 'px-[23.2px]'">
            <span class="block shrink-0 w-[36px] h-[29px] overflow-hidden" :class="{ 'mx-[17px]': compact }">
              <img src="images/sib_logo.PNG" alt="Brand Logo" class="block w-[36px] h-[29px]">
            </span>
            <a href="acceuil.html" class="block ml-2 text-white whitespace-nowrap">WORKFLOW - AWA</a>
            <a href="javascript:" class="block ml-auto text-white text-[21.456px] leading-[21.456px]"
               @click.prevent="$emit('toggle-collapse')">
                <i class="ion ion-md-menu align-middle [&::before]:align-baseline"></i>
            </a>
        </div>
        <div :class="DIVIDER + ' mt-0 mb-3'"></div>

        <ul class="flex flex-col items-start flex-auto m-0 py-1 overflow-y-auto overflow-x-hidden list-none [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#aaa_transparent]">

            <li class="w-full my-[2px]">
                <a href="acceuil.html" :class="link + ' bg-[#f9f9f9]'">
                    <i :class="'feather icon-home ' + icon"></i>
                    <div>Accueil</div>
                    <div class="pl-1 ml-auto"></div>
                </a>
            </li>

            <li :class="DIVIDER + ' mt-3 mb-1'"></li>

            <li class="w-full my-[2px]">
              <a href="javascript:" class="py-3 pr-[45.223px] font-medium"
                 :class="[LINK, compact ? 'pl-[70px] whitespace-nowrap' : 'pl-[27.2px]']"
                 @click.prevent="menuOpen = !menuOpen">
                  <div>{{ menuLabel }}</div>
                  <span class="absolute top-[22.5px] w-[6px] h-[6px] border-l border-b border-current -translate-y-[3px] transition-transform duration-200"
                        :class="[compact ? 'left-[56px]' : 'right-[27.2px]', menuOpen ? '-rotate-45' : 'rotate-45']"></span>
              </a>
              <ul v-show="menuOpen && !compact" class="flex flex-col m-0 py-[10px] list-none">
                <li v-if="menu.intro_dmd" id="intro_dmd" class="w-full">
                  <a href="introduire_demandes.html" :class="SUB_LINK">
                    <i :class="'feather icon-clipboard ' + SUB_ICON"></i>
                    <div>Introduire demande</div>
                  </a>
                </li>
                <li v-if="menu.consult_dmd" id="consult_dmd" class="w-full">
                  <a href="consulter_demandes.html" :class="SUB_LINK">
                    <i :class="'feather icon-grid ' + SUB_ICON"></i>
                    <div>Consulter mes demandes</div>
                  </a>
                </li>
                <li v-if="menu.valid_dmd" id="valid_dmd" class="w-full">
                    <a href="demandes_validation.html" :class="SUB_LINK">
                      <i :class="'feather icon-lock ' + SUB_ICON"></i>
                      <div>Valider des demandes</div>
                    </a>
                </li>
                <li v-if="menu.valid_dmd_ggrg" id="valid_dmd_ggrg" class="w-full">
                    <a href="ggrg_demandes_validation.html" :class="SUB_LINK">
                      <i :class="'feather icon-lock ' + SUB_ICON"></i>
                      <div>Valider des demandes</div>
                    </a>
                </li>
                <li v-if="menu.stats_dmd" id="stats_dmd" class="w-full">
                    <a href="javascript:" :class="SUB_LINK">
                      <i :class="statsIcon"></i>
                      <div>   Statistiques</div>
                    </a>
                </li>
                <li v-if="menu.hist_dmd" id="hist_dmd" class="w-full">
                    <a href="historique.html" :class="SUB_LINK">
                      <i class="bi bi-bar-chart block"></i>
                      <div>   Historique</div>
                    </a>
                </li>
              </ul>
            </li>

            <li :class="DIVIDER + ' mt-3 mb-1'"></li>

            <li class="w-full my-[2px]">
                <a href="pages_authentication_login-v1.html" :class="link">
                    <i :class="'feather icon-lock ' + icon"></i>
                    <div>Login</div>
                </a>
            </li>
            <li class="w-full my-[2px]">
                <a href="pages_authentication_register-v1.html" :class="link">
                    <i :class="'feather icon-user ' + icon"></i>
                    <div>Signup</div>
                </a>
            </li>
            <li class="w-full my-[2px]">
                <a href="pages_faq.html" :class="link">
                    <i :class="'feather icon-anchor ' + icon"></i>
                    <div>FAQ</div>
                </a>
            </li>
        </ul>
    </div>
  `,
});
