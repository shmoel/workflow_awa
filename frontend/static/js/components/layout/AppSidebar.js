/**
 * components/layout/AppSidebar.js
 *
 * Sidebar de navigation — composant Vue 3.
 *
 * Reproduit à l'identique la sidebar legacy (UIKit sidenav) :
 *   - Logo + titre "WORKFLOW - AWA"
 *   - Liens : Accueil / Introduire demande / Consulter mes demandes /
 *             Valider des demandes / Historique / Statistiques
 *   - Masquage conditionnel des liens selon user.menu (calculé dans useCurrentUser)
 *   - Lien actif mis en évidence via la prop `activePage`
 *
 * Props :
 *   activePage : string  — nom de la page active (ex: "accueil", "intro_dmd")
 *                          Correspond aux clés de user.menu.
 *
 * Dépendances :
 *   - useCurrentUser (composable) — fournit user.menu et user.fullName
 *   - tokens.css — variables CSS couleurs de marque
 *   - Tailwind CDN — classes utilitaires (configuré dans la page HTML parente)
 *
 * Pas de librairies externes (pas de jQuery, pas d'UIKit, pas de Bootstrap).
 *
 * Persistance : l'état replié/déplié survit aux rechargements via localStorage
 * (clé "sidebar_collapsed"). Validé par l'utilisateur le 27/09/2026.
 */

import { defineComponent, ref } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { useCurrentUser } from "../../composables/useCurrentUser.js";
import { logout } from "../../services/auth.js";

/** Clé localStorage pour persister l'état replié de la sidebar */
const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

export default defineComponent({
  name: "AppSidebar",

  props: {
    /**
     * Identifie le lien actif dans la sidebar.
     * Valeurs possibles : "accueil" | "intro_dmd" | "consult_dmd" |
     *                     "valid_dmd" | "valid_dmd_ggrg" | "hist_dmd" | "stats_dmd"
     */
    activePage: {
      type: String,
      default: "accueil",
    },
  },

  setup() {
    const user = useCurrentUser();
    // La sidebar ne charge pas le profil elle-même —
    // la page parente appelle fetchUser() dans son setup().
    // Ici on lit simplement l'état réactif.

    // Repliage : état initial lu depuis localStorage, false par défaut
    const collapsed = ref(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");

    function toggleCollapse() {
      collapsed.value = !collapsed.value;
      // Persiste la préférence immédiatement
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed.value ? "1" : "0");
    }

    return { user, collapsed, toggleCollapse, logout };
  },

  template: /* html */ `
    <aside
      :class="[
        'flex flex-col h-screen sticky top-0 z-40 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      ]"
      style="background: var(--color-sidebar-bg); font-family: var(--font-family-base);"
      aria-label="Navigation principale"
    >
      <!-- ---- En-tête logo + titre ---- -->
      <div class="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <img
          src="images/sib_logo.PNG"
          alt="Logo AWA"
          class="w-9 h-9 rounded object-contain flex-shrink-0"
          onerror="this.style.display='none'"
        />
        <span
          v-show="!collapsed"
          class="text-white font-bold text-sm tracking-wide leading-tight truncate"
        >
          WORKFLOW - AWA
        </span>
        <!-- Bouton repliage -->
        <button
          @click="toggleCollapse"
          class="ml-auto text-slate-400 hover:text-white transition-colors focus:outline-none"
          :aria-label="collapsed ? 'Déplier le menu' : 'Replier le menu'"
          :aria-expanded="!collapsed"
        >
          <!-- Icône hamburger SVG (pas de dépendance icon-font) -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- ---- Liste de navigation ---- -->
      <nav class="flex-1 overflow-y-auto py-3" role="navigation">
        <ul class="list-none m-0 p-0 space-y-0.5" role="list">

          <!-- Accueil (toujours visible) -->
          <li v-if="user.menu.accueil">
            <a
              href="acceuil.html"
              :class="navClass('accueil')"
              :aria-current="activePage === 'accueil' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H14v-6h-4v6H4a1 1 0 01-1-1V9.75z"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Accueil</span>
            </a>
          </li>

          <!-- Séparateur -->
          <li role="separator" class="my-2 mx-4 border-t border-slate-700"></li>

          <!-- Introduire demande -->
          <li v-if="user.menu.intro_dmd">
            <a
              href="introduire_demandes.html"
              :class="navClass('intro_dmd')"
              :aria-current="activePage === 'intro_dmd' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Introduire demande</span>
            </a>
          </li>

          <!-- Consulter mes demandes -->
          <li v-if="user.menu.consult_dmd">
            <a
              href="consulter_demandes.html"
              :class="navClass('consult_dmd')"
              :aria-current="activePage === 'consult_dmd' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M4 6h16M4 10h16M4 14h8"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Consulter mes demandes</span>
            </a>
          </li>

          <!-- Valider des demandes (AWA / DG Local) -->
          <li v-if="user.menu.valid_dmd">
            <a
              href="demandes_validation.html"
              :class="navClass('valid_dmd')"
              :aria-current="activePage === 'valid_dmd' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Valider des demandes</span>
            </a>
          </li>

          <!-- Valider des demandes (GGR Group) -->
          <li v-if="user.menu.valid_dmd_ggrg">
            <a
              href="ggrg_demandes_validation.html"
              :class="navClass('valid_dmd_ggrg')"
              :aria-current="activePage === 'valid_dmd_ggrg' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Valider des demandes</span>
            </a>
          </li>

          <!-- Historique -->
          <li v-if="user.menu.hist_dmd">
            <a
              href="historique.html"
              :class="navClass('hist_dmd')"
              :aria-current="activePage === 'hist_dmd' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Historique</span>
            </a>
          </li>

          <!-- Statistiques -->
          <li v-if="user.menu.stats_dmd">
            <a
              href="#"
              :class="navClass('stats_dmd')"
              :aria-current="activePage === 'stats_dmd' ? 'page' : undefined"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <span v-show="!collapsed" class="nav-label">Statistiques</span>
            </a>
          </li>

        </ul>
      </nav>

      <!-- ---- Pied de sidebar : bouton déconnexion ---- -->
      <div class="border-t border-slate-700 p-3">
        <button
          @click="logout"
          :class="[
            'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors',
            'text-slate-400 hover:text-white hover:bg-slate-700',
          ]"
          :title="collapsed ? 'Déconnexion' : undefined"
          aria-label="Déconnexion"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon flex-shrink-0" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Déconnexion</span>
        </button>
      </div>
    </aside>
  `,

  methods: {
    /**
     * Retourne les classes Tailwind d'un lien de navigation.
     * Le lien actif reçoit la couleur de marque.
     * @param {string} key - clé du menu (ex: "accueil")
     * @returns {string[]}
     */
    navClass(key) {
      const isActive = this.activePage === key;
      return [
        "flex items-center gap-3 mx-2 rounded-lg px-3 py-2 text-sm transition-colors no-underline",
        isActive
          ? "text-white font-semibold"
          : "text-slate-300 hover:text-white hover:bg-slate-700",
        isActive ? "bg-brand" : "",
      ];
    },
  },
});
