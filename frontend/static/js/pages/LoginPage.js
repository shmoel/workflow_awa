/**
 * pages/LoginPage.js
 *
 * Composant "page" pour index.html — page d'accueil du site et connexion.
 *
 * Vitrine legacy complète (décision du 08/10/2026) : en-tête (Accueil /
 * À propos / Infos / Se Connecter), hero « WORK FLOW AWA », section WorkFlow,
 * section Connexion, pied de page (Localisation / Contacts). Même balisage,
 * même CSS Bootstrap 5 / Poppins repris dans index.html.
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
 * Corrections (voir CHANGELOG_REFACTORING.md, CORRECTION-07 et CORRECTION-12) :
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
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { login } from "../services/auth.js";

/** Page d'arrivée après connexion, quel que soit le niveau (CORRECTION-07) */
const HOME_PAGE = "acceuil.html";

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
      document.querySelectorAll(".about-card, .login-form").forEach((el) => {
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
    };
  },

  template: /* html */ `
    <header id="header" ref="header" class="header" :class="{ scrolled }">
        <div class="container-fluid container-xl position-relative d-flex align-items-center">
            <a href="#hero" class="logo d-flex align-items-center me-auto" @click.prevent="scrollToId('hero')">
                <h1 class="">Attijari West Africa</h1>
            </a>

            <nav id="navmenu" class="navmenu">
                <ul :class="{ show: mobileOpen }">
                    <li><a href="#hero" :class="{ active: activeId === 'hero' }" @click.prevent="scrollToId('hero')">Accueil</a></li>
                    <li><a href="#about" :class="{ active: activeId === 'about' }" @click.prevent="scrollToId('about')">À propos</a></li>
                    <li><a href="#footer" :class="{ active: activeId === 'footer' }" @click.prevent="scrollToId('footer')">Infos</a></li>
                </ul>
                <i class="mobile-nav-toggle d-xl-none bi bi-list" @click="mobileOpen = !mobileOpen"></i>
            </nav>

            <a class="cta-btn" href="#connexion" @click.prevent="scrollToId('connexion')">Se Connecter</a>
        </div>
    </header>

    <main class="main">
        <!-- Hero Section -->
        <section id="hero" class="hero">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-lg-6">
                        <div class="hero-content">
                            <h2>WORK FLOWww<br><span style="color: var(--primary-orange);">AWA</span></h2>
                            <p>Un Outil permettant d'Optimiser les processus métiers OKOKOK</p>
                            <a href="#about" class="btn-get-started" @click.prevent="scrollToId('about')">
                                Découvrir Plus
                                <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="hero-visual">
                            <div class="hero-shapes">
                                <div class="shape shape-1"></div>
                                <div class="shape shape-2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- About Section -->
        <section id="about" class="about">
            <div class="container">
                <div class="section-title">
                    <h2>WorkFlow</h2>
                </div>

                <div class="row gy-4">
                    <div class="col-lg-6">
                        <div class="about-card">
                            <h3>Plateforme de WorkFlow Bancaire</h3>
                            <div class="about-visual">
                                <i class="bi bi-diagram-3"></i>
                            </div>
                            <p>
                                Système sécurisé d'approbation multi-niveaux pour les
                                opérations bancaires. Optimisez votre workflow avec
                                des mises à jour en temps réel et un suivi complet.
                            </p>
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div class="about-card">
                            <h3>Fonctionnalités Avancées</h3>
                            <ul class="feature-list">
                                <li>
                                    <i class="bi bi-check-circle-fill"></i>
                                    <span>Processus d'approbation multi-niveaux</span>
                                </li>
                                <li>
                                    <i class="bi bi-check-circle-fill"></i>
                                    <span>Mises à jour en temps réel</span>
                                </li>
                                <li>
                                    <i class="bi bi-check-circle-fill"></i>
                                    <span>Gestion sécurisée des documents</span>
                                </li>
                                <li>
                                    <i class="bi bi-check-circle-fill"></i>
                                    <span>Historique complet des opérations</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Contact/Login Section -->
        <section id="connexion" class="contact">
            <div class="container">
                <div class="section-title">
                    <h2>Connexion</h2>
                </div>

                <div class="login-container">
                    <div id="alert-container">
                        <div v-if="alert" :class="'alert alert-' + alert.type + ' alert-custom'">
                            <i :class="'bi bi-' + (alert.type === 'success' ? 'check-circle' : 'exclamation-triangle')"></i>
                            {{ alert.text }}
                        </div>
                    </div>

                    <form id="loginForm" class="login-form" @submit.prevent="submit">
                        <h2>Accès Sécurisé</h2>

                        <div class="form-group">
                            <label for="username" class="form-label">Identifiant</label>
                            <input type="text" class="form-control" id="username" name="username" v-model="username"
                                   placeholder="Votre identifiant" autocomplete="username" required>
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">Mot de passe</label>
                            <input type="password" class="form-control" id="password" name="password" v-model="password"
                                   placeholder="Votre mot de passe" autocomplete="current-password" required>
                        </div>

                        <button type="submit" class="btn-login" :disabled="loading">
                            <span class="btn-text" v-show="!loading">Se Connecter</span>
                            <div class="loading" :style="{ display: loading ? 'inline-block' : 'none' }">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </button>

                        <a href="#" class="forgot-password" @click.prevent>Mot de passe oublié ?</a>
                    </form>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer id="footer" class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="row gy-4">
                    <div class="col-lg-4 col-md-6">
                        <div class="sitename">Attijari West Africa</div>
                        <div class="social-links">
                            <a href="#" @click.prevent><i class="bi bi-twitter-x"></i></a>
                            <a href="#" @click.prevent><i class="bi bi-facebook"></i></a>
                            <a href="#" @click.prevent><i class="bi bi-instagram"></i></a>
                            <a href="#" @click.prevent><i class="bi bi-linkedin"></i></a>
                        </div>
                    </div>

                    <div class="col-lg-4 col-md-3">
                        <h4>Localisation</h4>
                        <ul>
                            <li><p>128 Avenue Chardy</p></li>
                            <li><p>Abidjan, BP 225</p></li>
                        </ul>
                    </div>

                    <div class="col-lg-4 col-md-3">
                        <h4>Contacts</h4>
                        <ul>
                            <li><p><strong>Phone:</strong> +225 27 09 22 43 29</p></li>
                            <li><p><strong>Email:</strong> infos@attijariwestafrica.com</p></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="copyright">
                <p>© <span>attijariwestafrica</span> <strong>2024</strong> <span>All Rights Reserved</span></p>
            </div>
        </div>
    </footer>
  `,
});
