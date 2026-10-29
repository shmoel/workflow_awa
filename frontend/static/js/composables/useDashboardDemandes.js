/**
 * composables/useDashboardDemandes.js
 *
 * Tableau de demandes avec filtres, commun à l'accueil (acceuil.html) et à
 * l'historique (historique.html) : mêmes colonnes, mêmes 5 filtres en temps
 * réel (Banque / Entité / Type / Contrepartie / Date), comme le legacy.
 *
 * Lot G (feuille de route UI/UX) : colonne « Date / Heure » triable, étape en
 * pastille de statut, filtre par statut (cartes de compteurs de l'accueil :
 * `statut` = id_event, null = tous).
 *
 * Usage :
 *   const { liste, filters, statut, filteredRows, emptyText, filterFields, columns } =
 *     useDashboardDemandes("/demandes_cloturer/");
 *   onMounted(() => liste.load());
 *   // template : <DemandesCard :fields="filterFields" v-model="filters">
 *   //              <DemandesTable :rows="filteredRows" :columns="columns" :error="liste.error"
 *   //                             :loading="liste.loading" :empty-text="emptyText">
 *
 * @param {string | (() => string | null)} source - voir useDemandesList
 */

import { ref, computed } from "vue";
import { useDemandesList } from "./useDemandesList.js";
import { useRowFilters } from "./useRowFilters.js";
import { statutTone } from "../domain/workflow.js";
import { sortDate } from "../components/demandes/DemandesTable.js";
import { PILL } from "../components/ui/classes.js";

/** Colonnes du tableau (ordre identique au legacy) */
const COLUMNS = [
  { key: "banque",            label: "Banque",            wrap: "cc-label" },
  { key: "categorie_demande", label: "Entité",            wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande",   wrap: "cc" },
  { key: "nom_client",        label: "Contrepartie",      wrap: "cc" },
  { key: "_date_heure",       label: "Date / Heure",      wrap: "cc", sort: sortDate("date_avis", "heure_avis") },
  { key: "description",       label: "Niveau validation", wrap: "cc", pill: (r) => PILL[statutTone(r.max_event)] },
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

/** Date / heure du dernier avis, affichée « date | heure » (legacy) */
function withDateHeureAvis(rows) {
  return rows.map((r) => ({
    ...r,
    _date_heure: `${r.date_avis || "N/A"} | ${r.heure_avis || "N/A"}`,
  }));
}

export function useDashboardDemandes(source) {
  const liste  = useDemandesList(source, withDateHeureAvis);
  const statut = ref(null);
  const { filters, filterRows } = useRowFilters(FILTERED_FIELD);

  const filteredRows = computed(() => {
    const rows = filterRows(liste.rows);
    return statut.value === null ? rows : rows.filter((r) => Number(r.max_event) === statut.value);
  });

  // Ligne affichée quand le tableau est vide : liste vide ou filtres sans résultat
  const emptyText = computed(() =>
    liste.rows.length ? "Aucune demande ne correspond aux filtres" : "Aucune demande"
  );

  return { liste, filters, statut, filteredRows, emptyText, filterFields: FILTER_FIELDS, columns: COLUMNS };
}
