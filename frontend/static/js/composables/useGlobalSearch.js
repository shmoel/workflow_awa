/**
 * composables/useGlobalSearch.js
 *
 * Recherche fulltext temps réel sur un tableau de lignes.
 * Filtre sur toutes les valeurs string de la ligne (insensible à la casse,
 * sans accent). Indépendant des filtres colonnes de useRowFilters.
 *
 * Usage :
 *   const { searchQuery, applySearch } = useGlobalSearch();
 *   const filteredRows = computed(() => applySearch(baseRows.value));
 */

import { ref } from "vue";

/** Normalise une chaîne : minuscules, sans accents */
function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function useGlobalSearch() {
  const searchQuery = ref("");

  function applySearch(rows) {
    const q = normalize(searchQuery.value.trim());
    if (!q) return rows;
    return rows.filter((row) =>
      Object.values(row).some((v) => normalize(v).includes(q))
    );
  }

  return { searchQuery, applySearch };
}
