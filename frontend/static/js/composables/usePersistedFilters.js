/**
 * composables/usePersistedFilters.js
 *
 * Sauvegarde et restaure automatiquement les valeurs de filtres dans
 * localStorage. Chaque page utilise une clé distincte.
 *
 * Usage :
 *   import { usePersistedFilters } from "../composables/usePersistedFilters.js";
 *
 *   // À la place de : const filters = ref({ banque: "", entite: "" });
 *   const filters = usePersistedFilters("accueil", { banque: "", entite: "", type: "", contrepartie: "", date: "" });
 *
 *   // Les modifications de filters.value sont automatiquement sauvegardées.
 *   // Au montage suivant, les valeurs précédentes sont restaurées.
 *
 * @param {string} pageKey   — clé unique par page (ex : "accueil", "historique")
 * @param {Object} defaults  — valeurs par défaut (structure des filtres)
 * @returns {import("vue").Ref<Object>} ref réactif dont les changements sont persistés
 */

import { ref, watch } from "vue";

const STORAGE_PREFIX = "awa_filters_";

function readStorage(key, defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    // Garder uniquement les clés connues (protection contre des champs obsolètes)
    return Object.fromEntries(
      Object.keys(defaults).map((k) => [k, parsed[k] ?? defaults[k]])
    );
  } catch {
    return { ...defaults };
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch { /* stockage indisponible (mode privé) */ }
}

export function usePersistedFilters(pageKey, defaults) {
  const filters = ref(readStorage(pageKey, defaults));

  watch(
    filters,
    (v) => writeStorage(pageKey, v),
    { deep: true }
  );

  function resetFilters() {
    filters.value = { ...defaults };
  }

  return { filters, resetFilters };
}
