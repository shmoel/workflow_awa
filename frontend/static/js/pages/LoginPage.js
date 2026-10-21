/**
 * pages/LoginPage.js
 *
 * Composant "page" pour index.html — page d'accueil du site et connexion.
 *
 * Vitrine legacy complète (décision du 08/10/2026) : en-tête (Accueil /
 * À propos / Infos / Se Connecter), hero « WORK FLOW AWA », section WorkFlow,
 * section Connexion, pied de page (Localisation / Contacts). Rendu en classes
 * Tailwind (objet V), reproduisant le CSS legacy et Bootstrap 5 ; police Poppins.
 *
 * Endpoints (via services/auth.js → login()) :
 *   POST /login/     → token, stocké dans localStorage (token + tokenExpiry)
 *   GET  /users/me/  → contrôle du profil (id_niv_hab)
 *
 * Comportement legacy conservé :
 *   - Identifiant et mot de passe obligatoires (valeurs « trim »)
 *   - Message « Connexion réussie ! Redirection en cours... » puis accueil
 *   - Message « Erreur de connexion. Vérifiez vos identifiants. » en cas d'échec,
 *     effacé après 5 s
 *   - JavaScript de la vitrine repris sans Bootstrap JS : en-tête « scrolled »
 *     après 50 px, menu mobile, défilement doux vers les ancres (décalé de la
 *     hauteur de l'en-tête), lien actif selon la section visible, apparition
 *     en fondu des cartes
 *
 * Corrections (voir docs/CHANGELOG_REFACTORING.md, CORRECTION-07 et CORRECTION-12) :
 *   - Tous les niveaux sont redirigés vers l'accueil (le niveau 4 l'était vers
 *     admin_acceuil.html, inexistant)
 *   - Message d'erreur si le profil est illisible après le login (le legacy
 *     restait bloqué sur « Connexion réussie ! » sans redirection)
 *   - Attente artificielle de 2 s avant la redirection supprimée
 *   - Liens href="#" (mot de passe oublié, réseaux sociaux) : sans effet ; le
 *     legacy levait une erreur (document.querySelector("#"))
 */

import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
} from "vue";
import { login } from "../services/auth.js";

/** Page d'arrivée après connexion, quel que soit le niveau (CORRECTION-07) */
const HOME_PAGE = "acceuil.html";

// ---------------------------------------------------------------------------
// Classes Tailwind de la vitrine (valeurs relevées sur le CSS legacy de
// index.html + Bootstrap 5)
// ---------------------------------------------------------------------------

// Attention : text-base vaut 14,3 px dans la configuration partagée (pages
// connectées) ; la vitrine utilise les 16 px de Bootstrap 5 : text-[1rem].
const SHADOW_IN = "transition-all duration-300";

const V = {
  // Conteneurs Bootstrap 5 (.container / .container-xl)
  container:   "w-full mx-auto px-3 sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1140px] xxl:max-w-[1320px]",
  containerXl: "w-full mx-auto px-3 xl:max-w-[1140px] xxl:max-w-[1320px]",
  cta:
    "block ml-4 px-4 py-[0.4rem] text-[0.8rem] font-medium text-white no-underline rounded-[20px] " +
    "bg-[linear-gradient(135deg,#ff6b35,#ff8c42)] shadow-[0_2px_8px_rgba(255,107,53,0.2)] " + SHADOW_IN + " " +
    "hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(255,107,53,0.3)] " +
    "max-[768px]:ml-0 max-[768px]:mt-[0.8rem] max-[768px]:text-center",
  btnStarted:
    "group relative inline-flex items-center gap-2 overflow-hidden px-8 py-[0.8rem] text-[0.9rem] font-medium " +
    "text-white no-underline bg-[#1a1a1a] rounded-[30px] " + SHADOW_IN + " " +
    "hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(26,26,26,0.2)]",
  // Reflet qui traverse le bouton au survol (ex-::before)
  shine:
    "absolute top-0 -left-full w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] " +
    "transition-[left] duration-500 ease-in-out group-hover:left-full",
  sectionTitle: "mb-2 text-[2.2rem] max-[768px]:text-[1.8rem] font-bold leading-[1.2] tracking-[-0.5px] text-[#1a1a1a]",
  sectionBar:   "block w-[50px] h-[3px] mx-auto my-4 rounded-[2px] bg-[#ff6b35]",
  card:
    "h-full p-8 max-[768px]:p-6 bg-white border border-[#e9ecef] rounded-[15px] shadow-[0_5px_25px_rgba(0,0,0,0.06)] " +
    SHADOW_IN + " hover:-translate-y-[5px] hover:shadow-[0_10px_35px_rgba(0,0,0,0.1)]",
  cardTitle: "mb-6 text-[1.4rem] font-semibold leading-[1.2] text-[#1a1a1a]",
  feature:
    "flex items-center py-[0.8rem] text-[0.9rem] font-medium text-[#1a1a1a] border-b border-[#e9ecef] last:border-b-0",
  alert: {
    success: "relative block mb-4 px-4 py-[0.8rem] text-[0.9rem] font-medium text-[#28a745] rounded-[10px] " +
             "border-l-[3px] border-[#28a745] bg-[linear-gradient(135deg,rgba(40,167,69,0.1),rgba(40,167,69,0.05))]",
    danger:  "relative block mb-4 px-4 py-[0.8rem] text-[0.9rem] font-medium text-[#dc3545] rounded-[10px] " +
             "border-l-[3px] border-[#dc3545] bg-[linear-gradient(135deg,rgba(220,53,69,0.1),rgba(220,53,69,0.05))]",
  },
  form:
    "relative p-10 max-[768px]:p-8 max-[768px]:mx-4 bg-white border border-[#e9ecef] rounded-[20px] " +
    "shadow-[0_10px_40px_rgba(0,0,0,0.08)]",
  label: "block mb-2 text-[0.9rem] font-medium text-[#1a1a1a]",
  input:
    "block w-full px-4 py-[0.8rem] text-[0.9rem] leading-[1.5] text-[#212529] bg-white border-2 border-[#e9ecef] " +
    "rounded-[10px] placeholder:text-[rgba(33,37,41,0.75)] " + SHADOW_IN + " " +
    "focus:outline-none focus:border-[#ff6b35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] focus:-translate-y-px",
  btnLogin:
    "group relative inline-block w-full overflow-hidden mb-4 px-6 py-[0.8rem] text-[0.9rem] font-semibold text-white " +
    "border-0 rounded-[10px] bg-[linear-gradient(135deg,#ff6b35,#ff8c42)] cursor-pointer disabled:cursor-default " + SHADOW_IN + " " +
    "hover:-translate-y-px hover:shadow-[0_5px_20px_rgba(255,107,53,0.3)]",
  social:
    "flex items-center justify-center w-10 h-10 text-[1.1rem] text-[#ccc] underline bg-white/10 rounded-full " +
    SHADOW_IN + " hover:bg-[#ff6b35] hover:text-white hover:-translate-y-0.5",
  footTitle: "mb-4 text-[1rem] font-semibold leading-[1.2] text-[#ff6b35]",
  footList:  "mb-4 p-0 list-none",
  footItem:  "mb-2 text-[0.9rem] leading-[1.5] text-[#ccc]",
};

/** Lien du menu : gris, souligné en orange (animé) s'il est actif ou survolé */
const NAV_LINK =
  "relative py-[0.3rem] text-[0.9rem] no-underline transition-all duration-300 " +
  "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-[#ff6b35] after:transition-[width] after:duration-300 " +
  "hover:text-[#1a1a1a] hover:after:w-full";

const FEATURES = [
  "Processus d'approbation multi-niveaux",
  "Mises à jour en temps réel",
  "Gestion sécurisée des documents",
  "Historique complet des opérations",
];
const SOCIALS = ["twitter-x", "facebook", "instagram", "linkedin"];

export default defineComponent({
  name: "LoginPage",

  setup() {
    const username = ref("");
    const password = ref("");
    const loading  = ref(false);
    /** { type: "success" | "danger", text: string } | null */
    const alert    = ref(null);
    let alertTimer = null;

    // ---- Vitrine ----
    const header     = ref(null);
    const scrolled   = ref(false);
    const mobileOpen = ref(false);
    const activeId   = ref("hero");

    /** Comme showAlert() legacy : le message disparaît après 5 s */
    function showAlert(type, text) {
      alert.value = { type, text };
      clearTimeout(alertTimer);
      alertTimer = setTimeout(() => { alert.value = null; }, 5000);
    }

    async function submit() {
      const u = username.value.trim();
      const p = password.value.trim();
      if (!u || !p) {
        showAlert("danger", "Veuillez remplir correctement le formulaire");
        return;
      }

      loading.value = true;
      alert.value   = null;
      try {
        await login(u, p);
        showAlert("success", "Connexion réussie ! Redirection en cours...");
        window.location.href = HOME_PAGE;
      } catch (e) {
        console.error("[login]", e);
        showAlert("danger", "Erreur de connexion. Vérifiez vos identifiants.");
        loading.value = false;
      }
    }

    function headerHeight() {
      return header.value ? header.value.offsetHeight : 0;
    }

    /** Défilement doux vers une ancre, décalé de la hauteur de l'en-tête (legacy) */
    function scrollToId(id) {
      const target = document.getElementById(id);
      if (!target) return;
      window.scrollTo({ top: target.offsetTop - headerHeight(), behavior: "smooth" });
    }

    /** En-tête « scrolled » et lien actif selon la section visible (legacy) */
    function onScroll() {
      scrolled.value = window.scrollY > 50;
      let current = "";
      document.querySelectorAll("section[id]").forEach((section) => {
        const top = section.offsetTop - headerHeight() - 50;
        if (window.pageYOffset >= top && window.pageYOffset < top + section.offsetHeight) {
          current = section.id;
        }
      });
      activeId.value = current;
    }

    // Apparition en fondu des cartes (IntersectionObserver legacy)
    let observer = null;

    onMounted(() => {
      window.addEventListener("scroll", onScroll);
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.observe(el);
      });
    });

    onUnmounted(() => {
      window.removeEventListener("scroll", onScroll);
      if (observer) observer.disconnect();
    });

    return {
      username, password, loading, alert, submit,
      header, scrolled, mobileOpen, activeId, scrollToId,
      V, features: FEATURES, socials: SOCIALS,
      navLink: (id) => NAV_LINK + (activeId.value === id ? " text-[#1a1a1a] after:w-full" : " text-[#6c757d] after:w-0"),
    };
  },

  template: /* html */ `
    <header id="header" ref="header"
            class="fixed top-0 z-[1000] flex items-center w-full h-[70px] border-b border-[#e9ecef] backdrop-blur-[10px] transition-all duration-300"
            :class="scrolled ? 'bg-white/[.98] shadow-[0_2px_20px_rgba(0,0,0,0.1)]' : 'bg-white/95'">
        <div :class="V.containerXl + ' relative flex items-center'">
            <a href="#hero" class="flex items-center mr-auto text-[#0d6efd] underline" @click.prevent="scrollToId('hero')">
                <h1 class="m-0 text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.3px] text-[#1a1a1a]">Attijari West Africa</h1>
            </a>

            <nav id="navmenu">
                <ul class="items-center gap-6 m-0 p-0 list-none flex max-[768px]:hidden max-[768px]:absolute max-[768px]:top-full max-[768px]:left-0 max-[768px]:right-0 max-[768px]:flex-col max-[768px]:gap-[0.8rem] max-[768px]:p-4 max-[768px]:bg-white max-[768px]:shadow-[0_5px_20px_rgba(0,0,0,0.1)]"
                    :class="{ 'max-[768px]:!flex': mobileOpen }">
                    <li><a href="#hero" :class="navLink('hero')" @click.prevent="scrollToId('hero')">Accueil</a></li>
                    <li><a href="#about" :class="navLink('about')" @click.prevent="scrollToId('about')">À propos</a></li>
                    <li><a href="#footer" :class="navLink('footer')" @click.prevent="scrollToId('footer')">Infos</a></li>
                </ul>
                <i class="hidden max-[768px]:block xl:!hidden bi bi-list text-[1.3rem] text-[#1a1a1a] cursor-pointer" @click="mobileOpen = !mobileOpen"></i>
            </nav>

            <a :class="V.cta" href="#connexion" @click.prevent="scrollToId('connexion')">Se Connecter</a>
        </div>
    </header>

    <main>
        <!-- Hero Section -->
        <section id="hero" class="relative flex items-center min-h-[90vh] pt-[70px] overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8f9fa_100%)] max-[768px]:min-h-[80vh] max-[768px]:pb-8">
            <span class="absolute -top-[30%] -right-[15%] w-[60%] h-[150%] rotate-[15deg] bg-[linear-gradient(45deg,transparent_30%,rgba(255,107,53,0.04)_50%,transparent_70%)]"></span>
            <div :class="V.container">
                <div class="flex flex-wrap items-center -mx-3">
                    <div class="w-full lg:w-1/2 px-3">
                        <div class="relative z-[2]">
                            <h2 class="mb-4 text-[3rem] max-[768px]:text-[2.2rem] font-bold leading-[1.1] tracking-[-1px] text-[#1a1a1a]">WORK FLOWww<br><span class="text-[#ff6b35]">AWA</span></h2>
                            <p class="mb-8 text-[1.1rem] max-[768px]:text-[1rem] font-light text-[#6c757d]">Un Outil permettant d'Optimiser les processus métiers OKOKOK</p>
                            <a href="#about" :class="V.btnStarted" @click.prevent="scrollToId('about')">
                                <span :class="V.shine"></span>
                                Découvrir Plus
                                <i class="block bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                    <div class="w-full lg:w-1/2 px-3">
                        <div class="relative h-[400px] max-[768px]:h-[300px] max-[768px]:mt-8">
                            <div class="absolute w-full h-full">
                                <div class="absolute top-[15%] right-[25%] w-[150px] h-[150px] rounded-[15px] opacity-[.08] bg-[#ff6b35] rotate-45 animate-float"></div>
                                <div class="absolute bottom-[25%] right-[15%] w-[100px] h-[100px] rounded-[15px] opacity-[.08] bg-[#1a1a1a] -rotate-[30deg] animate-float-slow"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- About Section -->
        <section id="about" class="py-16 max-[768px]:py-12 bg-white">
            <div :class="V.container">
                <div class="mb-12 text-center">
                    <h2 :class="V.sectionTitle">WorkFlow</h2>
                    <span :class="V.sectionBar"></span>
                </div>

                <div class="flex flex-wrap -mx-3 -mt-6">
                    <div class="w-full lg:w-1/2 px-3 mt-6">
                        <div :class="V.card" data-reveal>
                            <h3 :class="V.cardTitle">Plateforme de WorkFlow Bancaire</h3>
                            <div class="relative flex items-center justify-center w-full h-[180px] mb-6 overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,#f8f9fa,#e9ecef)]">
                                <span class="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(255,107,53,0.08)_50%,transparent_70%)]"></span>
                                <i class="relative z-[2] block text-[3rem] text-[#ff6b35] bi bi-diagram-3"></i>
                            </div>
                            <p class="mb-6 text-[0.95rem] leading-[1.6] text-[#6c757d]">
                                Système sécurisé d'approbation multi-niveaux pour les
                                opérations bancaires. Optimisez votre workflow avec
                                des mises à jour en temps réel et un suivi complet.
                            </p>
                        </div>
                    </div>

                    <div class="w-full lg:w-1/2 px-3 mt-6">
                        <div :class="V.card" data-reveal>
                            <h3 :class="V.cardTitle">Fonctionnalités Avancées</h3>
                            <ul class="mb-4 p-0 list-none">
                                <li v-for="f in features" :key="f" :class="V.feature">
                                    <i class="block w-4 mr-[0.8rem] text-[1rem] leading-[1.6] text-[#ff6b35] bi bi-check-circle-fill"></i>
                                    <span>{{ f }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Contact/Login Section -->
        <section id="connexion" class="relative py-16 max-[768px]:py-12 bg-[#f8f9fa]">
            <div :class="V.container">
                <div class="mb-12 text-center">
                    <h2 :class="V.sectionTitle">Connexion</h2>
                    <span :class="V.sectionBar"></span>
                </div>

                <div class="max-w-[450px] mx-auto">
                    <div id="alert-container">
                        <div v-if="alert" :class="V.alert[alert.type]">
                            <i :class="'bi bi-' + (alert.type === 'success' ? 'check-circle' : 'exclamation-triangle')"></i>
                            {{ alert.text }}
                        </div>
                    </div>

                    <form id="loginForm" :class="V.form" data-reveal @submit.prevent="submit">
                        <span class="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-[linear-gradient(90deg,#ff6b35,#ff8c42)]"></span>
                        <h2 class="mb-8 text-[1.6rem] font-semibold leading-[1.2] text-center text-[#1a1a1a]">Accès Sécurisé</h2>

                        <div class="relative mb-6">
                            <label for="username" :class="V.label">Identifiant</label>
                            <input type="text" :class="V.input" id="username" name="username" v-model="username"
                                   placeholder="Votre identifiant" autocomplete="username" required>
                        </div>

                        <div class="relative mb-6">
                            <label for="password" :class="V.label">Mot de passe</label>
                            <input type="password" :class="V.input" id="password" name="password" v-model="password"
                                   placeholder="Votre mot de passe" autocomplete="current-password" required>
                        </div>

                        <button type="submit" :class="V.btnLogin" :disabled="loading">
                            <span :class="V.shine"></span>
                            <span v-show="!loading">Se Connecter</span>
                            <div :style="{ display: loading ? 'inline-block' : 'none' }">
                                <div class="inline-block w-4 h-4 align-[-0.125em] border-[0.2em] border-current border-r-transparent rounded-full animate-spin-btn" role="status">
                                    <span class="sr-only">Loading...</span>
                                </div>
                            </div>
                        </button>

                        <a href="#" class="block text-[0.85rem] text-center text-[#6c757d] no-underline transition-colors duration-300 hover:text-[#ff6b35]" @click.prevent>Mot de passe oublié ?</a>
                    </form>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer id="footer" class="relative pt-12 pb-6 text-white bg-[#1a1a1a]">
        <span class="absolute top-0 left-0 right-0 h-[3px] bg-[linear-gradient(90deg,#ff6b35,#ff8c42)]"></span>
        <div :class="V.container">
            <div class="mb-8">
                <div class="flex flex-wrap -mx-3 -mt-6">
                    <div class="w-full md:w-1/2 lg:w-1/3 px-3 mt-6">
                        <div class="mb-4 text-[1.3rem] font-semibold">Attijari West Africa</div>
                        <div class="flex gap-[0.8rem] mt-4">
                            <a v-for="icon in socials" :key="icon" href="#" :class="V.social" @click.prevent><i :class="'block bi bi-' + icon"></i></a>
                        </div>
                    </div>

                    <div class="w-full md:w-1/4 lg:w-1/3 px-3 mt-6">
                        <h4 :class="V.footTitle">Localisation</h4>
                        <ul :class="V.footList">
                            <li :class="V.footItem"><p :class="V.footItem">128 Avenue Chardy</p></li>
                            <li :class="V.footItem"><p :class="V.footItem">Abidjan, BP 225</p></li>
                        </ul>
                    </div>

                    <div class="w-full md:w-1/4 lg:w-1/3 px-3 mt-6">
                        <h4 :class="V.footTitle">Contacts</h4>
                        <ul :class="V.footList">
                            <li :class="V.footItem"><p :class="V.footItem"><strong>Phone:</strong> +225 27 09 22 43 29</p></li>
                            <li :class="V.footItem"><p :class="V.footItem"><strong>Email:</strong> infos@attijariwestafrica.com</p></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="pt-6 text-[0.85rem] text-center text-[#999] border-t border-[#333]">
                <p :class="V.footItem">© <span>attijariwestafrica</span> <strong>2024</strong> <span>All Rights Reserved</span></p>
            </div>
        </div>
    </footer>
  `,
});
