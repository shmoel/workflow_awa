/**
 * composables/useDashboardDemandes.js
 *
 * Tableau de demandes avec filtres, commun à l'accueil (acceuil.html) et à
 * l'historique (historique.html) : mêmes colonnes, mêmes 5 filtres en temps
 * réel (Banque / Entité / Type / Contrepartie / Date), comme le legacy.
 *
 * Usage :
 *   const { liste, filters, filteredRows, filterFields, columns } =
 *     useDashboardDemandes("/demandes_cloturer/");
 *   onMounted(() => liste.load());
 *   // template : <DemandesCard :fields="filterFields" v-model="filters">
 *   //              <DemandesTable :rows="filteredRows" :columns="columns" :error="liste.error">
 *
 * @param {string | (() => string | null)} source - voir useDemandesList
 */

import { ref, computed } from "vue";
import { useDemandesList } from "./useDemandesList.js";

/** Colonnes du tableau (ordre identique au legacy) */
const COLUMNS = [
  { key: "banque",            label: "Banque",            wrap: "cc-label" },
  { key: "categorie_demande", label: "Entité",            wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande",   wrap: "cc" },
  { key: "nom_client",        label: "Contrepartie",      wrap: "cc" },
  { key: "_date_heure",       label: "Date / Heure",      wrap: "cc" },
  { key: "description",       label: "Niveau validation", wrap: "cc" },
];

/** Champs de filtre (placeholders legacy) */
const FILTER_FIELDS = [
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "date",         placeholder: "Filtrer par date " },
];

/** Champ filtré par chaque filtre */
const FILTERED_FIELD = {
  banque:       "banque",
  entite:       "categorie_demande",
  type:         "type_demande",
  contrepartie: "nom_client",
  date:         "_date_heure",
};

const EMPTY_FILTERS = { banque: "", entite: "", type: "", contrepartie: "", date: "" };

/** Date / heure du dernier avis, affichée « date | heure » (legacy) */
function withDateHeureAvis(rows) {
  return rows.map((r) => ({
    ...r,
    _date_heure: `${r.date_avis || "N/A"} | ${r.heure_avis || "N/A"}`,
  }));
}

export function useDashboardDemandes(source) {
  const liste   = useDemandesList(source, withDateHeureAvis);
  const filters = ref({ ...EMPTY_FILTERS });

  // Filtrage en temps réel : sous-chaîne, sans tenir compte des majuscules
  const filteredRows = computed(() => {
    const actifs = Object.entries(filters.value)
      .map(([filtre, valeur]) => [FILTERED_FIELD[filtre], valeur.toLowerCase()]);
    return liste.rows.filter((r) =>
      actifs.every(([champ, valeur]) => (r[champ] ?? "").toLowerCase().includes(valeur))
    );
  });

  return { liste, filters, filteredRows, filterFields: FILTER_FIELDS, columns: COLUMNS };
}
