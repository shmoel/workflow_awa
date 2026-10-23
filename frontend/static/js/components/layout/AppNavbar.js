/**
 * components/layout/AppNavbar.js
 *
 * Barre supérieure (Tailwind) — reprend la navbar « bg-dark » du legacy :
 * avatar + nom de l'utilisateur à droite, menu déroulant avec « Déconnexion ».
 *
 * Nom à droite sur toutes les pages (9 pages legacy sur 10 ; l'accueil legacy
 * avait une coquille de classe qui le plaçait à gauche). Sous 992 px, le
 * contenu de la barre est masqué, comme dans le legacy (navbar-collapse).
 *
 * Le menu déroulant était ouvert par Bootstrap JS (data-toggle="dropdown") :
 * il est ouvert ici par Vue, et se ferme au clic en dehors. Le bouton
 * « Déconnexion » garde l'apparence native du navigateur avec la police de la
 * page (input legacy sans style) : fond, bordure et marges internes rétablis
 * aux valeurs du navigateur ([…:revert]).
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

// Élément du menu déroulant (ex-.dropdown-item)
const ITEM = "block px-5 py-2 leading-[22.0282px] whitespace-nowrap text-ink hover:bg-[rgba(24,28,33,0.03)]";

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

    return { fullName, open, root, logout, ITEM };
  },

  template: /* html */ `
    <nav class="relative z-navbar flex items-center px-4 lg:px-8 py-2 bg-chrome text-chrome-text shadow-[1px_0_0_1px_rgba(0,0,0,0.08)]">

        <div class="hidden lg:flex items-center flex-auto">
            <div class="flex items-center ml-auto">

                <div class="ml-1 mr-4 text-[16.0205px] font-light leading-none opacity-25">|</div>
                <div ref="root" class="relative">
                    <a class="block px-2 py-3 whitespace-nowrap" :class="open ? 'text-white' : 'text-chrome-text'" href="#" @click.prevent="open = !open">
                        <span class="inline-flex flex-row-reverse items-center align-middle">
                            <img src="images/avatar.png" alt class="block w-[30px] h-[30px] rounded-full">
                            <span id="user_id" class="px-1 mr-2">{{ fullName }}</span>
                        </span><span class="inline-block align-middle ml-[7.152px] -mt-[4.005px] w-[6px] h-[6px] border-r border-b border-current rotate-45"></span>
                    </a>
                    <div v-show="open"
                         class="absolute right-0 top-full z-[1000] min-w-[10rem] mt-1 mb-[2px] py-[5px] bg-white text-ink rounded-[2px] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.07),0_4px_5px_0_rgba(0,0,0,0.05),0_1px_10px_0_rgba(0,0,0,0.03)]">
                        <a href="javascript:" :class="ITEM">
                            <i class="feather icon-user text-muted leading-[14.304px]"></i> &nbsp; My profile</a>
                        <a href="javascript:" :class="ITEM">
                            <i class="feather icon-mail text-muted leading-[14.304px]"></i> &nbsp; Messages</a>
                        <a href="javascript:" :class="ITEM">
                            <i class="feather icon-settings text-muted leading-[14.304px]"></i> &nbsp; Account settings</a>
                        <div class="h-px my-2 overflow-hidden border-t border-[rgba(24,28,33,0.05)]"></div>

                          <a href="javascript:" :class="ITEM" @click.prevent="logout">
                            <i class="feather icon-power text-danger leading-[14.304px]"></i> &nbsp;
                            <input type="button" name="" value="Déconnexion" class="[background-color:revert] [background-image:revert] [border:revert] [padding:revert] [color:revert]">
                          </a>

                    </div>
                </div>
            </div>
        </div>
    </nav>
  `,
});
