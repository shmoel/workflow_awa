/**
 * composables/useDemandesList.js
 *
 * Liste de demandes chargée depuis une route GET de l'API (un tableau ou un
 * onglet) : lignes, état de chargement, message d'erreur.
 *
 * Usage :
 *   const intro = useDemandesList("/demandes_a_valider/");
 *   const fin   = useDemandesList("/demandes_fin_process/", (rows) => rows.map(…));
 *   onMounted(() => intro.load());
 *   // template : <DemandesTable :rows="intro.rows" :error="intro.error">
 *
 * @param {string | (() => string | null)} source - route, ou fonction qui la
 *        calcule au moment du chargement (null : rien à charger)
 * @param {(rows: object[]) => object[]} [normalize] - transformation des lignes
 *        (champs calculés : date / heure, état…)
 * @returns {{ rows: object[], loading: boolean, error: string|null, load: () => Promise<void> }}
 *          objet réactif (pas de .value)
 */

import { reactive } from "vue";
import { apiGet } from "../services/api.js";

export function useDemandesList(source, normalize = (rows) => rows) {
  const state = reactive({
    rows:    [],
    loading: true,
    error:   null,
    load,
  });

  async function load() {
    state.loading = true;
    state.error   = null;
    try {
      const route = typeof source === "function" ? source() : source;
      if (!route) return;
      const data = await apiGet(route);
      state.rows = normalize(data.results ?? []);
    } catch (e) {
      state.error = e.message;
    } finally {
      state.loading = false;
    }
  }

  return state;
}
