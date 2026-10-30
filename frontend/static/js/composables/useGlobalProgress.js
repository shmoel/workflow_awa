/**
 * composables/useGlobalProgress.js
 *
 * Composable pour gérer une barre de progression globale.
 * Utile pour indiquer visuellement le chargement des données.
 *
 * Usage:
 * ```js
 * import { useGlobalProgress } from './composables/useGlobalProgress.js';
 * 
 * const progress = useGlobalProgress();
 * 
 * // Démarrer
 * progress.start();
 * 
 * // Mettre à jour
 * progress.set(50);
 * 
 * // Terminer
 * progress.finish();
 * 
 * // Terminer avec erreur
 * progress.fail();
 * ```
 */

import { ref } from "vue";

// État global partagé
const showing = ref(false);
const progress = ref(0);
const indeterminate = ref(false);
const color = ref("brand");

// Timer pour l'animation automatique
let timer = null;

export function useGlobalProgress() {
  /**
   * Démarrer la progression (mode indéterminé par défaut)
   */
  function start() {
    showing.value = true;
    progress.value = 0;
    indeterminate.value = true;
    color.value = "brand";
    
    // Animation automatique progressive
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (progress.value < 90) {
        // Ralentir progressivement pour ne jamais atteindre 100%
        const increment = (100 - progress.value) * 0.1;
        progress.value = Math.min(90, progress.value + increment);
      }
    }, 300);
  }

  /**
   * Définir une progression spécifique (0-100)
   */
  function set(value) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    showing.value = true;
    indeterminate.value = false;
    progress.value = Math.max(0, Math.min(100, value));
  }

  /**
   * Incrémenter la progression
   */
  function increment(amount = 10) {
    if (indeterminate.value) {
      indeterminate.value = false;
    }
    progress.value = Math.min(100, progress.value + amount);
  }

  /**
   * Terminer avec succès (100% puis disparaît)
   */
  function finish() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    
    indeterminate.value = false;
    progress.value = 100;
    color.value = "success";

    setTimeout(() => {
      showing.value = false;
      progress.value = 0;
      color.value = "brand";
    }, 300);
  }

  /**
   * Terminer avec erreur (rouge puis disparaît)
   */
  function fail() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    indeterminate.value = false;
    progress.value = 100;
    color.value = "danger";

    setTimeout(() => {
      showing.value = false;
      progress.value = 0;
      color.value = "brand";
    }, 500);
  }

  /**
   * Cacher immédiatement
   */
  function hide() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    showing.value = false;
    progress.value = 0;
    indeterminate.value = false;
    color.value = "brand";
  }

  return {
    // État
    showing,
    progress,
    indeterminate,
    color,

    // Méthodes
    start,
    set,
    increment,
    finish,
    fail,
    hide,
  };
}
