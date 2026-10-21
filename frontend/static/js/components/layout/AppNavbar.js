/**
 * components/layout/AppNavbar.js
 *
 * Barre supérieure — balisage identique au legacy (navbar « bg-dark »,
 * avatar + nom de l'utilisateur, menu déroulant avec « Déconnexion »).
 *
 * Classe « navbar-collapse collapse » (9 pages legacy sur 10 : nom à droite) ;
 * l'accueil legacy avait une coquille (« navbar-collapSellapse ») qui plaçait
 * le nom à gauche.
 *
 * Le menu déroulant était ouvert par Bootstrap JS (data-toggle="dropdown") :
 * il est ouvert ici par Vue (classe "show"), et se ferme au clic en dehors.
 *
 * Dépendances :
 *   - useCurrentUser — user.fullName (profil chargé par la page)
 *   - auth.js logout() — déconnexion et retour à index.html (CORRECTION-01)
 */

import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
} from "vue";
import { useCurrentUser } from "../../composables/useCurrentUser.js";
import { logout } from "../../services/auth.js";

export default defineComponent({
  name: "AppNavbar",

  setup() {
    const user = useCurrentUser();
    const fullName = user.fullName;
    const open = ref(false);
    const root = ref(null);

    function onDocumentClick(e) {
      if (open.value && root.value && !root.value.contains(e.target)) open.value = false;
    }

    onMounted(() => document.addEventListener("click", onDocumentClick));
    onUnmounted(() => document.removeEventListener("click", onDocumentClick));

    return { fullName, open, root, logout };
  },

  template: /* html */ `
    <nav class="layout-navbar navbar navbar-expand-lg align-items-lg-center bg-dark container-p-x" id="layout-navbar">

        <div class="navbar-collapse collapse" id="layout-navbar-collapse">
            <div class="navbar-nav align-items-lg-center ml-auto">

                <div class="nav-item d-none d-lg-block text-big font-weight-light line-height-1 opacity-25 mr-3 ml-1">|</div>
                <div ref="root" class="demo-navbar-user nav-item dropdown" :class="{ show: open }">
                    <a class="nav-link dropdown-toggle" href="#" @click.prevent="open = !open">
                        <span class="d-inline-flex flex-lg-row-reverse align-items-center align-middle">
                            <img src="images/avatar.png" alt class="d-block ui-w-30 rounded-circle">
                            <span id="user_id" class="px-1 mr-lg-2 ml-2 ml-lg-0">{{ fullName }}</span>
                        </span>
                    </a>
                    <div class="dropdown-menu dropdown-menu-right" :class="{ show: open }">
                        <a href="javascript:" class="dropdown-item">
                            <i class="feather icon-user text-muted"></i> &nbsp; My profile</a>
                        <a href="javascript:" class="dropdown-item">
                            <i class="feather icon-mail text-muted"></i> &nbsp; Messages</a>
                        <a href="javascript:" class="dropdown-item">
                            <i class="feather icon-settings text-muted"></i> &nbsp; Account settings</a>
                        <div class="dropdown-divider"></div>

                          <a href="javascript:" class="dropdown-item" @click.prevent="logout">
                            <i class="feather icon-power text-danger"></i> &nbsp;
                            <input type="button" name="" value="Déconnexion">
                          </a>

                    </div>
                </div>
            </div>
        </div>
    </nav>
  `,
});
