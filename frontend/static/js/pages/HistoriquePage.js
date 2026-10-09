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
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet }                 from "../services/api.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppSidebar     from "../components/layout/AppSidebar.js";
import AppNavbar      from "../components/layout/AppNavbar.js";
import AppFooter      from "../components/layout/AppFooter.js";
import DemandesTable  from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";

// ---------------------------------------------------------------------------
// Colonnes du tableau (ordre identique au legacy)
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: "banque",            label: "Banque" },
  { key: "categorie_demande", label: "Entité" },
  { key: "type_demande",      label: "Type de demande" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "_date_heure",       label: "Date / Heure" },
  { key: "description",       label: "Niveau validation" },
];

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const FILTER_FIELDS = [
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "date",         placeholder: "Filtrer par date" },
];

const EMPTY_FILTERS = { banque: "", entite: "", type: "", contrepartie: "", date: "" };

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------
export default defineComponent({
  name: "HistoriquePage",

  components: { AppSidebar, AppNavbar, AppFooter, DemandesTable, DemandeFilters },

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
          _date_heure: `${r.date_avis || ""} ${r.heure_avis || ""}`.trim(),
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
    };
  },

  template: /* html */ `
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <AppSidebar active-page="hist_dmd" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Historique" />

        <main class="flex-1 p-5" role="main" aria-label="Historique des demandes clôturées">

          <section
            class="bg-white rounded-2xl shadow-sm border overflow-hidden"
            style="border-color: var(--color-brand-border);"
            aria-label="Demandes clôturées"
          >
            <!-- En-tête : filtres + onglet -->
            <div
              class="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-0 border-b"
              style="border-color: var(--color-brand-border);"
            >
              <div class="pb-3">
                <DemandeFilters :fields="filterFields" v-model="filters" />
              </div>
              <div class="pb-0">
                <ul class="flex list-none m-0 p-0" role="tablist">
                  <li role="presentation">
                    <button
                      role="tab"
                      aria-selected="true"
                      class="px-4 py-2 text-sm font-semibold border-b-2 focus:outline-none"
                      style="color: var(--color-brand); border-color: var(--color-brand); background: transparent;"
                    >
                      Demandes Clôturées
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Tableau -->
            <DemandesTable
              :rows="filteredRows"
              :columns="columns"
              :loading="loadingTable"
              :error="errorTable"
              aria-label="Tableau des demandes clôturées"
            >
              <template #actions="{ row }">
                <a
                  :href="'detail_consulter_demande.html?id_dmd=' + row.id_demande"
                  class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors inline-block"
                  style="color: var(--color-brand); border-color: var(--color-brand); background: #fff; text-decoration: none;"
                  onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                  onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                  :aria-label="'Détails de la demande ' + row.id_demande"
                >
                  Détails
                </a>
              </template>
            </DemandesTable>

          </section>

        </main>

        <AppFooter />
      </div>

      <!-- ================================================================
           Popup notification (polling — identique aux autres pages)
           ================================================================ -->
      <Transition name="fade">
        <div
          v-if="polling.show.value"
          class="fixed inset-0 z-50 flex items-start justify-center"
          style="background: rgba(0,0,0,0.35);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-title-historique"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-title-historique"
              class="text-xl font-bold text-center mb-4"
              style="color: var(--color-brand);"
            >
              Nouvelle demande à valider&nbsp;!
            </h2>
            <div class="overflow-x-auto mb-5">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr style="background: var(--color-brand); color: #fff;">
                    <th class="px-3 py-2 text-left font-semibold">Banque</th>
                    <th class="px-3 py-2 text-left font-semibold">Entité</th>
                    <th class="px-3 py-2 text-left font-semibold">Contrepartie</th>
                    <th class="px-3 py-2 text-left font-semibold">Date</th>
                    <th class="px-3 py-2 text-left font-semibold">Heure</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="d in polling.newDemandes.value"
                    :key="d.id_avis"
                    class="border-b"
                    style="border-color: var(--color-brand-border);"
                  >
                    <td class="px-3 py-2">{{ d.banque || '—' }}</td>
                    <td class="px-3 py-2">{{ d.categorie_demande || '—' }}</td>
                    <td class="px-3 py-2">{{ d.nom_client || '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ d.date_avis || '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ d.heure_avis || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="text-center">
              <button
                @click="polling.dismiss()"
                class="px-8 py-2 rounded-full text-white font-bold"
                style="background: var(--color-brand);"
                onmouseover="this.style.background='var(--color-brand-dark)';"
                onmouseout="this.style.background='var(--color-brand)';"
                autofocus
              >OK</button>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  `,
});
