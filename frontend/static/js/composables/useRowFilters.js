/**
 * composables/useRowFilters.js
 *
 * Filtres en temps réel d'une liste de demandes (champs DemandeFilters) :
 * sous-chaîne, sans tenir compte des majuscules, tous les filtres remplis
 * doivent correspondre. Commun à l'accueil, à l'historique et aux pages de
 * validation (lot G, feuille de route UI/UX, point 12).
 *
 * Usage :
 *   const { filters, filterRows } = useRowFilters({ banque: "banque", type: "type_demande" });
 *   const visibles = computed(() => filterRows(liste.rows));
 *   // template : <DemandeFilters :fields="…" v-model="filters">
 *
 * @param {Record<string, string>} fieldMap - clé du filtre → champ de la ligne filtré
 * @returns {{ filters: import("vue").Ref<Record<string, string>>,
 *             filterRows: (rows: object[]) => object[] }}
 */

import { ref } from "vue";

export function useRowFilters(fieldMap) {
  const filters = ref(Object.fromEntries(Object.keys(fieldMap).map((k) => [k, ""])));

  function filterRows(rows) {
    const actifs = Object.entries(filters.value)
      .filter(([, valeur]) => valeur)
      .map(([filtre, valeur]) => [fieldMap[filtre], valeur.toLowerCase()]);
    if (!actifs.length) return rows;
    return rows.filter((r) =>
      actifs.every(([champ, valeur]) => String(r[champ] ?? "").toLowerCase().includes(valeur))
    );
  }

  return { filters, filterRows };
}
