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
  onMounted,
  onUnmounted,
} from "vue";

import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";
import { useDashboardDemandes }   from "../composables/useDashboardDemandes.js";
import { goToDetail }             from "../utils/navigation.js";

import AppLayout from "../components/layout/AppLayout.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable  from "../components/demandes/DemandesTable.js";
import DemandesCard   from "../components/demandes/DemandesCard.js";
import { BTN }        from "../components/ui/classes.js";

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------
export default defineComponent({
  name: "HistoriquePage",

  components: { AppLayout, DemandesTable, DemandesCard, ActionCell },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // Colonnes, filtres et chargement communs avec l'accueil
    const { liste, filters, filteredRows, filterFields, columns } =
      useDashboardDemandes("/demandes_cloturer/");

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await liste.load();
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      liste,
      filteredRows,
      filters,
      filterFields,
      columns,
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
                    <DemandesTable theme="dashboard" :rows="filteredRows" :columns="columns" :action-headers="2" :error="liste.error">
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
