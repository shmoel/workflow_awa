/**
 * composables/useNotificationPolling.js
 *
 * Remplace le bloc "Système d'alerte nouvelle demande à valider" (~80 lignes)
 * copié dans 8 fichiers HTML legacy.
 *
 * Responsabilités :
 *   - Vérifier toutes les 15 s si une nouvelle demande à valider est arrivée
 *   - Comparer avec le dernier id_avis vu (stocké dans localStorage)
 *   - Exposer les nouvelles demandes via une ref Vue réactive (popup gérée
 *     dans le composant parent, pas ici — séparation logique/présentation)
 *   - S'arrêter automatiquement si l'utilisateur est Niveau 1
 *   - Mettre à jour le localStorage quand le popup est acquitté
 *
 * Usage :
 *
 *   import { useNotificationPolling } from '../../composables/useNotificationPolling.js';
 *
 *   const polling = useNotificationPolling();
 *   polling.start();   // démarrer (appelé dans onMounted de la page)
 *   polling.stop();    // arrêter  (appelé dans onUnmounted)
 *   polling.dismiss(); // acquitter le popup (appelé au clic "OK")
 *
 *   // Réactif dans le template :
 *   <div v-if="polling.show.value"> ... </div>
 *   <tr v-for="d in polling.newDemandes.value"> ... </tr>
 */

import { ref } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { apiGet } from "../services/api.js";
import { getToken } from "../services/auth.js";

/** Clé localStorage pour persister l'id du dernier avis vu */
const LAST_ID_KEY = "lastIdDemandeValidee";

/** Délai avant le premier poll après chargement de la page (ms) */
const POLL_DELAY_MS = 3_000;

/** Intervalle entre deux polls (ms) */
const POLL_INTERVAL_MS = 15_000;

export function useNotificationPolling() {
  /** Nouvelles demandes à afficher dans le popup */
  const newDemandes = ref([]);

  /** Contrôle l'affichage du popup */
  const show = ref(false);

  let _intervalId = null;

  // --------------------------------------------------------------------------
  // Lecture/écriture du dernier id vu
  // --------------------------------------------------------------------------

  function _getStoredId() {
    const v = localStorage.getItem(LAST_ID_KEY);
    return v ? parseInt(v, 10) : null;
  }

  function _setStoredId(id) {
    localStorage.setItem(LAST_ID_KEY, String(id));
  }

  // --------------------------------------------------------------------------
  // Logique de poll principal
  // --------------------------------------------------------------------------

  async function _tick() {
    if (!getToken()) return;

    try {
      // 1. Vérifie le niveau d'habilitation
      const profileData = await apiGet("/users-joined/");
      const profil = profileData.results?.[0];
      if (!profil) return;

      // Niveau 1 = pas validateur : on arrête le polling
      if (profil.niveau_hab === "Niveau 1") {
        stop();
        return;
      }

      // 2. Récupère le dernier avis disponible à valider
      const data = await apiGet("/derniere_demande_a_valider/");
      const lastDemande = data.results;

      // L'endpoint peut retourner un objet vide ou sans id_avis
      if (!lastDemande || !lastDemande.id_avis) return;

      const lastId = parseInt(lastDemande.id_avis, 10);
      const storedId = _getStoredId();

      // 3. Initialisation au premier poll
      if (storedId === null) {
        _setStoredId(lastId);
        return;
      }

      // 4. Nouvelles demandes arrivées depuis le dernier poll
      if (lastId > storedId) {
        await _fetchAndShowFromId(storedId + 1);
      }
    } catch (e) {
      // Erreur réseau silencieuse : ne pas interrompre le polling
      console.warn("[polling] Erreur tick :", e.message);
    }
  }

  // --------------------------------------------------------------------------
  // Récupère les nouvelles demandes et déclenche le popup
  // --------------------------------------------------------------------------

  async function _fetchAndShowFromId(fromId) {
    try {
      const data = await apiGet(`/derniere_demande_a_valider/${fromId}`);
      const results = data.results;

      let liste = [];
      if (Array.isArray(results) && results.length > 0) {
        liste = results;
      } else if (results && typeof results === "object" && results.id_avis) {
        liste = [results];
      }

      if (liste.length > 0) {
        newDemandes.value = liste;
        show.value = true;
      }
    } catch (e) {
      console.warn("[polling] Erreur fetch nouvelles demandes :", e.message);
    }
  }

  // --------------------------------------------------------------------------
  // API publique
  // --------------------------------------------------------------------------

  /**
   * Démarre le polling avec un délai initial de 3 s.
   * Idempotent : un deuxième appel n'ouvre pas un second intervalle.
   */
  function start() {
    if (_intervalId !== null) return;
    const timerId = setTimeout(() => {
      _tick();
      _intervalId = setInterval(_tick, POLL_INTERVAL_MS);
    }, POLL_DELAY_MS);
    // stocker le timeout pour pouvoir l'annuler avant qu'il ne démarre
    _intervalId = timerId;
  }

  /**
   * Stoppe le polling et nettoie les timers.
   */
  function stop() {
    if (_intervalId !== null) {
      clearTimeout(_intervalId);
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  /**
   * Acquitte le popup :
   *   - cache le popup
   *   - met à jour localStorage avec le dernier id vu
   */
  async function dismiss() {
    show.value = false;
    newDemandes.value = [];
    // Rafraîchit le dernier id pour éviter de réafficher le même popup
    try {
      const data = await apiGet("/derniere_demande_a_valider/");
      const last = data.results;
      if (last && last.id_avis) {
        _setStoredId(parseInt(last.id_avis, 10));
      }
    } catch {
      /* silencieux */
    }
  }

  return { newDemandes, show, start, stop, dismiss };
}
