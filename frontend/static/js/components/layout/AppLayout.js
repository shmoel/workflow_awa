/**
 * components/layout/AppLayout.js
 *
 * Squelette commun des pages connectées — balisage identique au legacy :
 *
 *   div.layout-wrapper.layout-2
 *     div.layout-inner
 *       AppSidebar                 (div#layout-sidenav)
 *       div.layout-container
 *         AppNavbar                (nav.layout-navbar)
 *         div.layout-content
 *           <slot />               (contenu de la page, ex. div.container-fluid)
 *           AppFooter              (nav.layout-footer)
 *     div.layout-overlay.layout-sidenav-toggle
 *   <slot name="modals" />         (modales Bootstrap de la page)
 *   NotificationPopup              (si la prop polling est fournie)
 *
 * Repli du menu (ex-layout-helpers.js + demo.js) :
 *   - écran ≥ 992 px : classe "layout-collapsed" sur <html>, mémorisée dans
 *     localStorage.layoutCollapsed (même clé que le legacy)
 *   - écran < 992 px : classe "layout-expanded" sur <html> (menu en surimpression),
 *     refermé par un clic sur l'overlay
 *
 * Props :
 *   polling   : objet useNotificationPolling() — affiche la popup si fourni
 *   menuLabel : libellé du sous-menu de la sidebar (« Menu » par défaut)
 */

import { defineComponent, onMounted } from "vue";

import AppSidebar        from "./AppSidebar.js";
import AppNavbar         from "./AppNavbar.js";
import AppFooter         from "./AppFooter.js";
import NotificationPopup from "./NotificationPopup.js";

const COLLAPSED_KEY    = "layoutCollapsed";
const LAYOUT_BREAKPOINT = 992;

function isSmallScreen() {
  return window.innerWidth < LAYOUT_BREAKPOINT;
}

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
}

export default defineComponent({
  name: "AppLayout",

  components: { AppSidebar, AppNavbar, AppFooter, NotificationPopup },

  props: {
    polling:   { type: Object, default: null },
    menuLabel: { type: String, default: "Menu" },
  },

  setup() {
    const html = document.documentElement;

    function toggleCollapse() {
      if (isSmallScreen()) {
        html.classList.toggle("layout-expanded");
        return;
      }
      const collapsed = html.classList.toggle("layout-collapsed");
      try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch { /* stockage indisponible */ }
    }

    function closeExpanded() {
      html.classList.remove("layout-expanded");
    }

    onMounted(() => {
      if (!isSmallScreen() && readCollapsed()) html.classList.add("layout-collapsed");
    });

    return { toggleCollapse, closeExpanded };
  },

  template: /* html */ `
    <div class="layout-wrapper layout-2">
        <div class="layout-inner">
            <AppSidebar :menu-label="menuLabel" @toggle-collapse="toggleCollapse" />

            <div class="layout-container">
                <AppNavbar />

                <div class="layout-content">
                    <slot />
                    <AppFooter />
                </div>
            </div>
        </div>
        <div class="layout-overlay layout-sidenav-toggle" @click="closeExpanded"></div>
    </div>

    <slot name="modals" />

    <NotificationPopup v-if="polling" :polling="polling" />
  `,
});
