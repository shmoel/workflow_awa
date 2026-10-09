/**
 * components/layout/AppNavbar.js
 *
 * Barre de navigation supérieure — composant Vue 3.
 *
 * Reproduit à l'identique la navbar legacy :
 *   - Fond sombre (bg-dark du layout UIKit)
 *   - Nom de l'utilisateur connecté (id="user_id" dans le legacy)
 *   - Avatar rond
 *   - Bouton "Déconnexion"
 *
 * Props :
 *   pageTitle : string  — titre de la page affiché dans la navbar (optionnel)
 *
 * Dépendances :
 *   - useCurrentUser — lit user.fullName (déjà chargé par la page parente)
 *   - auth.js logout() — pour la déconnexion
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { useCurrentUser } from "../../composables/useCurrentUser.js";
import { logout } from "../../services/auth.js";

export default defineComponent({
  name: "AppNavbar",

  props: {
    pageTitle: {
      type: String,
      default: "",
    },
  },

  setup() {
    const user = useCurrentUser();
    return { user, logout };
  },

  template: /* html */ `
    <header
      class="flex items-center justify-between px-5 py-3 shadow-sm"
      style="background:#1e293b; font-family: var(--font-family-base);"
      role="banner"
    >
      <!-- Titre de page (optionnel) -->
      <div class="text-white font-semibold text-base tracking-wide">
        {{ pageTitle }}
      </div>

      <!-- Zone utilisateur droite -->
      <div class="flex items-center gap-3">

        <!-- Indicateur de chargement discret -->
        <span
          v-if="user.loading.value"
          class="text-slate-400 text-sm animate-pulse"
          aria-live="polite"
        >
          Chargement…
        </span>

        <!-- Avatar + nom -->
        <div v-else class="flex items-center gap-2">
          <img
            src="images/avatar.png"
            alt="Avatar"
            class="w-8 h-8 rounded-full object-cover border-2"
            style="border-color: var(--color-brand);"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%228%22 r=%224%22 fill=%22%23cbd5e1%22/%3E%3Cellipse cx=%2212%22 cy=%2219%22 rx=%228%22 ry=%224%22 fill=%22%23cbd5e1%22/%3E%3C/svg%3E'"
          />
          <span
            id="user_id"
            class="text-white text-sm font-medium hidden sm:inline"
            aria-label="Utilisateur connecté"
          >
            {{ user.fullName.value }}
          </span>
        </div>

        <!-- Bouton déconnexion -->
        <button
          @click="logout"
          class="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
          style="color: var(--color-brand); border: 1.5px solid var(--color-brand); background: transparent;"
          onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
          onmouseout="this.style.background='transparent';this.style.color='var(--color-brand)';"
          aria-label="Se déconnecter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
          </svg>
          <span class="hidden sm:inline">Déconnexion</span>
        </button>

      </div>
    </header>
  `,
});
