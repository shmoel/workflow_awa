/**
 * components/layout/AppLayout.js
 *
 * Squelette commun des pages connectées (Tailwind, reprend la mise en page
 * legacy « layout-2 » d'UIKit) :
 *
 *   AppSidebar                 menu latéral fixe, 250 px (70 px replié)
 *   colonne de contenu         décalée de la largeur du menu (écran ≥ 992 px)
 *     AppNavbar                barre du haut
 *     <slot />                 contenu de la page
 *     AppFooter                pied de page, poussé en bas
 *   <slot name="modals" />     modales de la page
 *   NotificationPopup          si la prop polling est fournie
 *
 * Repli du menu (ex-layout-helpers.js + demo.js) :
 *   - écran ≥ 992 px : menu replié à 70 px (icônes seules), mémorisé dans
 *     localStorage.layoutCollapsed (même clé que le legacy). Au survol, le menu
 *     replié se déploie à 250 px par-dessus le contenu, sans le décaler.
 *   - écran < 992 px : menu masqué ; s'il est ouvert, il passe en surimpression
 *     et un clic sur le voile le referme. Comme dans le legacy, aucun bouton
 *     visible ne l'ouvre à cette taille.
 *
 * Props :
 *   polling   : objet useNotificationPolling() — affiche la popup si fourni
 *   menuLabel : libellé du sous-menu du menu latéral (« Menu » par défaut)
 */

import { defineComponent, ref, computed } from "vue";

import AppSidebar        from "./AppSidebar.js";
import AppNavbar         from "./AppNavbar.js";
import AppFooter         from "./AppFooter.js";
import NotificationPopup from "./NotificationPopup.js";
import ProgressBar       from "../ui/ProgressBar.js";
import { useGlobalProgress } from "../../composables/useGlobalProgress.js";

const COLLAPSED_KEY     = "layoutCollapsed";
const LAYOUT_BREAKPOINT = 992;

function isSmallScreen() {
  return window.innerWidth < LAYOUT_BREAKPOINT;
}

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
}

export default defineComponent({
  name: "AppLayout",

  components: { AppSidebar, AppNavbar, AppFooter, NotificationPopup, ProgressBar },

  props: {
    polling:   { type: Object, default: null },
    menuLabel: { type: String, default: "Menu" },
  },

  setup() {
    const collapsed = ref(!isSmallScreen() && readCollapsed());
    const expanded  = ref(false);   // menu ouvert en surimpression (< 992 px)
    const hovered   = ref(false);   // survol du menu replié

    // Menu affiché en icônes seules : replié et non survolé
    const compact = computed(() => collapsed.value && !hovered.value);

    function toggleCollapse() {
      if (isSmallScreen()) {
        expanded.value = !expanded.value;
        return;
      }
      collapsed.value = !collapsed.value;
      hovered.value = false;
      try { localStorage.setItem(COLLAPSED_KEY, String(collapsed.value)); } catch { /* stockage indisponible */ }
    }

    function toggleMobileMenu() {
      expanded.value = !expanded.value;
    }

    const gp = useGlobalProgress();

    return { collapsed, expanded, hovered, compact, toggleCollapse, toggleMobileMenu, gp };
  },

  template: /* html */ `
    <ProgressBar :show="gp.showing.value" :progress="gp.progress.value"
                 :indeterminate="gp.indeterminate.value" :color="gp.color.value" />

    <div class="flex min-h-screen overflow-hidden bg-[#f4f4f4] dark:bg-[#1a1a2e] transition-colors duration-300">
        <AppSidebar :menu-label="menuLabel" :compact="compact" :collapsed="collapsed" :expanded="expanded"
                    @toggle-collapse="toggleCollapse" @hover="hovered = collapsed && $event" />

        <div class="flex flex-col flex-auto w-full min-w-0 min-h-screen transition-[padding] duration-200"
             :class="collapsed ? 'lg:pl-[70px]' : 'lg:pl-[250px]'">
            <AppNavbar @toggle-mobile-menu="toggleMobileMenu" />

            <div class="flex flex-col flex-auto justify-between dark:text-[#e2e8f0]">
                <slot />
                <AppFooter />
            </div>
        </div>

        <div v-if="expanded" class="fixed inset-0 z-[1079] bg-[rgba(24,28,33,0.5)] lg:hidden"
             @click="expanded = false"></div>
    </div>

    <slot name="modals" />

    <NotificationPopup v-if="polling" :polling="polling" />
  `,
});
