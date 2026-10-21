/**
 * components/layout/AppSidebar.js
 *
 * Menu latéral — balisage identique au legacy (UIKit « layout-sidenav »,
 * classes et icônes d'origine, CSS static/vendor/uikit).
 *
 * Comportements repris du JavaScript legacy (sidenav.js + demo.js), sans jQuery :
 *   - Sous-menu « Menu » : fermé au chargement, s'ouvre / se ferme au clic
 *     (classe "open" sur l'item, comme SideNav.toggle())
 *   - Bouton ☰ : replie le menu (événement "toggle-collapse" géré par AppLayout)
 *   - Liens masqués selon le niveau d'habilitation (user.menu, ex-infos_user())
 *   - « Accueil » porte la classe "active" sur toutes les pages, comme dans
 *     le legacy (balisage copié tel quel dans chaque page)
 *   - Liens « Login », « Signup », « FAQ » conservés comme dans le legacy
 *     (décision du 08/10/2026) : ils mènent à des pages inexistantes (404)
 *
 * Props :
 *   menuLabel : libellé du sous-menu — « Menu » sur la plupart des pages legacy,
 *               « Actions » sur demandes_validation et chat. Sur ces deux pages,
 *               l'entrée « Statistiques » a aussi l'icône legacy « cadenas »
 *               (sidenav-icon feather icon-lock) au lieu de bi-bar-chart.
 */

import { defineComponent, ref, computed } from "vue";
import { useCurrentUser } from "../../composables/useCurrentUser.js";

export default defineComponent({
  name: "AppSidebar",

  props: {
    menuLabel: { type: String, default: "Menu" },
  },

  emits: ["toggle-collapse"],

  setup(props) {
    const user = useCurrentUser();
    // computed rangé dans un objet ordinaire : exposé directement pour que
    // le template le déballe
    const menu = user.menu;
    const menuOpen = ref(false);
    const statsIcon = computed(() =>
      props.menuLabel === "Actions" ? "sidenav-icon feather icon-lock" : "bi bi-bar-chart"
    );

    return { menu, menuOpen, statsIcon };
  },

  template: /* html */ `
    <div id="layout-sidenav" class="layout-sidenav sidenav sidenav-vertical bg-white logo-dark">
        <div class="app-brand demo">
            <span class="app-brand-logo demo">
              <img src="images/sib_logo.PNG" alt="Brand Logo" class="img-fluid">
            </span>
            <a href="acceuil.html" class="app-brand-text demo sidenav-text font-weight-normal ml-2">WORKFLOW - AWA</a>
            <a href="javascript:" class="layout-sidenav-toggle sidenav-link text-large ml-auto"
               @click.prevent="$emit('toggle-collapse')">
                <i class="ion ion-md-menu align-middle"></i>
            </a>
        </div>
        <div class="sidenav-divider mt-0"></div>

        <ul class="sidenav-inner py-1">

            <li class="sidenav-item active">
                <a href="acceuil.html" class="sidenav-link">
                    <i class="sidenav-icon feather icon-home"></i>
                    <div>Accueil</div>
                    <div class="pl-1 ml-auto">
                        <div class="badge badge-danger"></div>
                    </div>
                </a>
            </li>

            <li class="sidenav-divider mb-1"></li>

            <li class="sidenav-item" :class="{ open: menuOpen }">
              <a href="javascript:" class="sidenav-link sidenav-toggle font-weight-semibold"
                 @click.prevent="menuOpen = !menuOpen">
                  <i class=""></i>
                  <div>{{ menuLabel }}</div>
              </a>
              <ul class="sidenav-menu">
                <li v-if="menu.intro_dmd" id="intro_dmd" class="sidenav-item">
                  <a href="introduire_demandes.html" class="sidenav-link">
                    <i class="sidenav-icon feather icon-clipboard"></i>
                    <div>Introduire demande</div>
                  </a>
                </li>
                <li v-if="menu.consult_dmd" id="consult_dmd" class="sidenav-item">
                  <a href="consulter_demandes.html" class="sidenav-link">
                    <i class="sidenav-icon feather icon-grid"></i>
                    <div>Consulter mes demandes</div>
                  </a>
                </li>
                <li v-if="menu.valid_dmd" id="valid_dmd" class="sidenav-item">
                    <a href="demandes_validation.html" class="sidenav-link">
                      <i class="sidenav-icon feather icon-lock"></i>
                      <div>Valider des demandes</div>
                    </a>
                </li>
                <li v-if="menu.valid_dmd_ggrg" id="valid_dmd_ggrg" class="sidenav-item">
                    <a href="ggrg_demandes_validation.html" class="sidenav-link">
                      <i class="sidenav-icon feather icon-lock"></i>
                      <div>Valider des demandes</div>
                    </a>
                </li>
                <li v-if="menu.stats_dmd" id="stats_dmd" class="sidenav-item">
                    <a href="javascript:" class="sidenav-link">
                      <i :class="statsIcon"></i>
                      <div>   Statistiques</div>
                    </a>
                </li>
                <li v-if="menu.hist_dmd" id="hist_dmd" class="sidenav-item">
                    <a href="historique.html" class="sidenav-link">
                      <i class="bi bi-bar-chart"></i>
                      <div>   Historique</div>
                    </a>
                </li>
              </ul>
            </li>

            <li class="sidenav-divider mb-1"></li>

            <li class="sidenav-item">
                <a href="pages_authentication_login-v1.html" class="sidenav-link">
                    <i class="sidenav-icon feather icon-lock"></i>
                    <div>Login</div>
                </a>
            </li>
            <li class="sidenav-item">
                <a href="pages_authentication_register-v1.html" class="sidenav-link">
                    <i class="sidenav-icon feather icon-user"></i>
                    <div>Signup</div>
                </a>
            </li>
            <li class="sidenav-item">
                <a href="pages_faq.html" class="sidenav-link">
                    <i class="sidenav-icon feather icon-anchor"></i>
                    <div>FAQ</div>
                </a>
            </li>
        </ul>
    </div>
  `,
});
