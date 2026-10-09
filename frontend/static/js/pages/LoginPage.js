/**
 * pages/LoginPage.js
 *
 * Composant "page" pour index.html — connexion.
 *
 * Formulaire de connexion seul, aux couleurs AWA : la vitrine du legacy
 * (hero, présentation, navigation par ancres, animations) n'est pas reprise.
 *
 * Endpoints (via services/auth.js → login()) :
 *   POST /login/     → token, stocké dans localStorage (token + tokenExpiry)
 *   GET  /users/me/  → contrôle du profil (id_niv_hab)
 *
 * Comportement legacy conservé :
 *   - Identifiant et mot de passe obligatoires (valeurs « trim »)
 *   - Message « Connexion réussie ! Redirection en cours... » puis accueil
 *   - Message « Erreur de connexion. Vérifiez vos identifiants. » en cas d'échec
 *
 * Corrections (voir CHANGELOG_REFACTORING.md, CORRECTION-07 et CORRECTION-12) :
 *   - Tous les niveaux sont redirigés vers l'accueil (le niveau 4 l'était vers
 *     admin_acceuil.html, inexistant)
 *   - Message d'erreur si le profil est illisible après le login (le legacy
 *     restait bloqué sur « Connexion réussie ! » sans redirection)
 *   - Attente artificielle de 2 s avant la redirection supprimée
 *   - Lien mort « Mot de passe oublié ? » (href="#") non repris
 */

import { defineComponent, ref } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { login } from "../services/auth.js";

/** Page d'arrivée après connexion, quel que soit le niveau (CORRECTION-07) */
const HOME_PAGE = "acceuil.html";

export default defineComponent({
  name: "LoginPage",

  setup() {
    const username = ref("");
    const password = ref("");
    const loading  = ref(false);
    /** { type: "success" | "error", text: string } | null */
    const alert    = ref(null);

    async function submit() {
      const u = username.value.trim();
      const p = password.value.trim();
      if (!u || !p) {
        alert.value = { type: "error", text: "Veuillez remplir correctement le formulaire" };
        return;
      }

      loading.value = true;
      alert.value   = null;
      try {
        await login(u, p);
        alert.value = { type: "success", text: "Connexion réussie ! Redirection en cours..." };
        window.location.href = HOME_PAGE;
      } catch (e) {
        console.error("[login]", e);
        alert.value = { type: "error", text: "Erreur de connexion. Vérifiez vos identifiants." };
        loading.value = false;
      }
    }

    return { username, password, loading, alert, submit };
  },

  template: /* html */ `
    <div class="min-h-screen flex flex-col" style="background: var(--color-bg-page);">

      <main class="flex-1 flex items-center justify-center px-4 py-10" role="main">
        <div class="w-full max-w-sm">

          <div class="flex flex-col items-center mb-6">
            <img
              src="images/sib_logo.PNG"
              alt="Logo AWA"
              class="w-16 h-16 rounded object-contain mb-3"
              onerror="this.style.display='none'"
            />
            <h1 class="text-xl font-bold tracking-wide m-0" style="color: var(--color-sidebar-bg);">
              WORKFLOW - AWA
            </h1>
          </div>

          <form
            class="bg-white rounded-2xl shadow-sm border-t-4 p-7 space-y-4"
            style="border-top-color: var(--color-brand);"
            @submit.prevent="submit"
            aria-labelledby="login-title"
          >
            <h2 id="login-title" class="text-lg font-bold text-center m-0">Accès Sécurisé</h2>

            <div
              v-if="alert"
              class="rounded-xl border px-4 py-3 text-sm"
              :style="alert.type === 'success'
                ? 'border-color: var(--color-status-validated); color: var(--color-status-validated); background: #f0fdf4;'
                : 'border-color: var(--color-status-rejected); color: var(--color-status-rejected); background: #fef2f2;'"
              :role="alert.type === 'success' ? 'status' : 'alert'"
            >{{ alert.text }}</div>

            <div>
              <label for="username" class="block text-sm font-semibold mb-1">Identifiant</label>
              <input
                id="username"
                v-model="username"
                type="text"
                required
                autocomplete="username"
                placeholder="Votre identifiant"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                style="border-color: var(--color-brand-border);"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-semibold mb-1">Mot de passe</label>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="Votre mot de passe"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                style="border-color: var(--color-brand-border);"
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full py-2.5 rounded-full text-white text-sm font-bold disabled:opacity-60"
              style="background: var(--color-brand);"
            >{{ loading ? 'Connexion…' : 'Se Connecter' }}</button>
          </form>
        </div>
      </main>

      <footer class="text-center text-sm py-4" style="color: var(--color-text-secondary);" role="contentinfo">
        &copy; <span class="font-semibold" style="color: var(--color-brand);">Attijari West Africa</span>
      </footer>
    </div>
  `,
});
