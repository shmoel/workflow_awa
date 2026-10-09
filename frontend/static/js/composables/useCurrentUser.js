/**
 * composables/useCurrentUser.js
 *
 * Remplace la fonction infos_user() copiée dans 9 fichiers HTML legacy.
 *
 * Responsabilités :
 *   - Récupérer une seule fois le profil via GET /users-joined/
 *   - Mettre le résultat en cache (ref Vue) pour éviter les appels répétés
 *   - Exposer les champs du profil directement (nom, prenom, niveau_hab,
 *     banque, entite, domaine, user_id) — les pages n'ont plus à indexer results[0]
 *   - Calculer les flags de visibilité des menus (ancienne logique de
 *     infos_user() dissimulée dans du DOM manipulation, ici en données réactives)
 *
 * Usage dans un composant Vue :
 *
 *   import { useCurrentUser } from '../../composables/useCurrentUser.js';
 *
 *   export default {
 *     async setup() {
 *       const user = useCurrentUser();
 *       await user.fetchUser();
 *       return { user };
 *     }
 *   }
 *
 *   // Dans le template :
 *   {{ user.fullName }}
 *   <li v-if="user.menu.intro_dmd"> ... </li>
 */

import { ref, computed } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { apiGet } from "../services/api.js";
import { isAuthenticated } from "../services/auth.js";

// ---------------------------------------------------------------------------
// Singleton : le profil n'est chargé qu'une fois par page (même si plusieurs
// composants appellent useCurrentUser())
// ---------------------------------------------------------------------------
let _instance = null;

export function useCurrentUser() {
  if (_instance) return _instance;

  // ---- État brut ----
  const raw = ref(null);       // donnees.results[0] tel que retourné par l'API
  const loading = ref(false);
  const error = ref(null);

  // ---- Champs exposés (computed pour réactivité) ----
  const nom         = computed(() => raw.value?.nom       ?? "");
  const prenom      = computed(() => raw.value?.prenom    ?? "");
  const fullName    = computed(() => `${prenom.value} ${nom.value}`.trim());
  const niveau_hab  = computed(() => raw.value?.niveau_hab ?? "");
  const banque      = computed(() => raw.value?.banque    ?? "");
  const entite      = computed(() => raw.value?.entite    ?? "");
  const domaine     = computed(() => raw.value?.domaine   ?? "");
  const user_id     = computed(() => raw.value?.user_id   ?? null);

  // ---- Visibilité des liens du menu ----
  // Logique extraite de infos_user() legacy :
  //
  // Niveau 1  → cache : intro, consult, valid, valid_ggrg, hist
  // Niveau 2  → cache : valid, valid_ggrg
  // Niveau 3  → cache : intro, consult
  //             + selon banque/entité :
  //               AIG + GGR  → cache valid  (voit valid_ggrg)
  //               autres     → cache valid_ggrg (voit valid)
  //
  // Les flags "show" sont plus explicites que "hide" côté template.
  const menu = computed(() => {
    const niv = niveau_hab.value;

    if (niv === "Niveau 1") {
      return {
        accueil:    true,
        intro_dmd:     false,
        consult_dmd:   false,
        valid_dmd:     false,
        valid_dmd_ggrg: false,
        hist_dmd:      false,
        stats_dmd:     true,
      };
    }

    if (niv === "Niveau 2") {
      return {
        accueil:    true,
        intro_dmd:     true,
        consult_dmd:   true,
        valid_dmd:     false,
        valid_dmd_ggrg: false,
        hist_dmd:      false,
        stats_dmd:     true,
      };
    }

    if (niv === "Niveau 3") {
      // AIG + entité GGR → validateur GGR Group
      if (banque.value === "AIG" && entite.value === "GGR") {
        return {
          accueil:    true,
          intro_dmd:     false,
          consult_dmd:   false,
          valid_dmd:     false,      // cache le lien AWA validation
          valid_dmd_ggrg: true,      // garde le lien GGR group
          hist_dmd:      true,
          stats_dmd:     true,
        };
      }
      // Autres Niveau 3 (validateurs AWA / DG / etc.)
      return {
        accueil:    true,
        intro_dmd:     false,
        consult_dmd:   false,
        valid_dmd:     true,        // garde le lien AWA validation
        valid_dmd_ggrg: false,      // cache le lien GGR group
        hist_dmd:      true,
        stats_dmd:     true,
      };
    }

    // Fallback sécurisé — tout visible (ne devrait pas arriver)
    return {
      accueil:    true,
      intro_dmd:     true,
      consult_dmd:   true,
      valid_dmd:     true,
      valid_dmd_ggrg: true,
      hist_dmd:      true,
      stats_dmd:     true,
    };
  });

  // ---- Méthode de chargement ----

  /**
   * Charge le profil depuis l'API.
   * - Vérifie d'abord que l'utilisateur est authentifié (redirige sinon).
   * - Ne fait qu'un seul appel même si appelé plusieurs fois.
   * @returns {Promise<void>}
   */
  async function fetchUser() {
    // Déjà chargé
    if (raw.value !== null) return;
    // Token absent → redirection gérée par isAuthenticated
    if (!isAuthenticated(true)) return;

    loading.value = true;
    error.value = null;
    try {
      const data = await apiGet("/users-joined/");
      if (!data.results || data.results.length === 0) {
        throw new Error("[useCurrentUser] Aucun profil retourné par /users-joined/");
      }
      raw.value = data.results[0];
    } catch (e) {
      error.value = e.message;
      console.error("[useCurrentUser]", e);
    } finally {
      loading.value = false;
    }
  }

  _instance = {
    raw,
    loading,
    error,
    nom,
    prenom,
    fullName,
    niveau_hab,
    banque,
    entite,
    domaine,
    user_id,
    menu,
    fetchUser,
    /** Réinitialise le singleton (utile pour les tests ou le logout) */
    reset() {
      raw.value = null;
      error.value = null;
      _instance = null;
    },
  };

  return _instance;
}
