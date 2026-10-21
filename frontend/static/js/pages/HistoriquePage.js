/**
 * pages/HistoriquePage.js
 *
 * Page d'historique des demandes clôturées.
 *
 * Reproduit le comportement legacy (historique.html) avec la correction :
 *   CORRECTION-05 : suppression de la détection de nouveau message
 *     et des N appels GET /messages_chat/{id}. La variable `badge` était
 *     non déclarée dans le legacy (affichait "undefined" dans la colonne Banque).
 *     Les demandes clôturées n'ont plus de workflow actif, les appels sont
 *     sans valeur ajoutée.
 *
 * Endpoint  : GET /demandes_cloturer/
 * Colonnes  : Banque | Entité | Type de demande | Contrepartie |
 *             Date / Heure (date_avis + heure_avis) | Niveau validation
 * Filtres   : Banque / Entité / Type / Contrepartie / Date
 * Action    : Détails → detail_consulter_demande.html?id_dmd={id}
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "vue";

import { apiGet }                 from "../services/api.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable  from "../components/demandes/DemandesTable.js";
import DemandesCard   from "../components/demandes/DemandesCard.js";
import { BTN }        from "../components/ui/classes.js";

function goToDetail(id) {
  window.location.href = `detail_consulter_demande.html?id_dmd=${id}`;
}

// ---------------------------------------------------------------------------
// Colonnes du tableau (ordre identique au legacy)
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: "banque",            label: "Banque",            wrap: "cc-label" },
  { key: "categorie_demande", label: "Entité",            wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande",   wrap: "cc" },
  { key: "nom_client",        label: "Contrepartie",      wrap: "cc" },
  { key: "_date_heure",       label: "Date / Heure",      wrap: "cc" },
  { key: "description",       label: "Niveau validation", wrap: "cc" },
];

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const FILTER_FIELDS = [
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "date",         placeholder: "Filtrer par date " },
];

const EMPTY_FILTERS = { banque: "", entite: "", type: "", contrepartie: "", date: "" };

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------
export default defineComponent({
  name: "HistoriquePage",

  components: { AppLayout, DemandesTable, DemandesCard, ActionCell },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    const allDemandes  = ref([]);
    const loadingTable = ref(true);
    const errorTable   = ref(null);
    const filters      = ref({ ...EMPTY_FILTERS });

    // ---- Liste filtrée ----
    const filteredRows = computed(() => {
      const b = filters.value.banque.toLowerCase();
      const e = filters.value.entite.toLowerCase();
      const t = filters.value.type.toLowerCase();
      const c = filters.value.contrepartie.toLowerCase();
      const d = filters.value.date.toLowerCase();
      return allDemandes.value.filter(
        (r) =>
          (r.banque            ?? "").toLowerCase().includes(b) &&
          (r.categorie_demande ?? "").toLowerCase().includes(e) &&
          (r.type_demande      ?? "").toLowerCase().includes(t) &&
          (r.nom_client        ?? "").toLowerCase().includes(c) &&
          (r._date_heure       ?? "").toLowerCase().includes(d)
      );
    });

    // ---- Chargement ----
    async function loadDemandes() {
      loadingTable.value = true;
      errorTable.value   = null;
      try {
        const data = await apiGet("/demandes_cloturer/");
        allDemandes.value = (data.results ?? []).map((r) => ({
          ...r,
          _date_heure: `${r.date_avis || "N/A"} | ${r.heure_avis || "N/A"}`,
        }));
      } catch (e) {
        errorTable.value = e.message;
      } finally {
        loadingTable.value = false;
      }
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await loadDemandes();
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      filteredRows,
      loadingTable,
      errorTable,
      filters,
      filterFields: FILTER_FIELDS,
      columns:      COLUMNS,
      goToDetail,
      BTN,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex-grow px-4 lg:px-8 py-6">

            <div class="flex flex-wrap -mx-3">

                <div class="h-[310px]" id="tasks-inner"></div>

                <DemandesCard tab-label="Demandes Cloturees" :fields="filterFields" v-model="filters">
                    <DemandesTable theme="dashboard" :rows="filteredRows" :columns="columns" :action-headers="2" :error="errorTable">
                        <template #actions="{ row }">
                            <ActionCell :btn-class="BTN.outlineBrand" label="Détails" @click="goToDetail(row.id_demande)" />
                        </template>
                    </DemandesTable>
                </DemandesCard>
            </div>

        </div>
    </AppLayout>
  `,
});
