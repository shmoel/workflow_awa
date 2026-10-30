/**
 * pages/StatistiquesPage.js
 *
 * Page Statistiques — répartition des demandes par niveau de validation.
 *
 * Affiche :
 *   - 6 cartes de compteurs (GET /nombre_demandes/{niveau}), une par niveau
 *   - Histogramme SVG inline (DashboardChart) : même graphique que l'accueil
 *   - Tableau récapitulatif des totaux par niveau
 *
 * Accessible via statistiques.html ; lien dans le sous-menu "Statistiques"
 * du menu latéral (AppSidebar).
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "vue";

import { apiGet }                from "../services/api.js";
import { useCurrentUser }        from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppLayout     from "../components/layout/AppLayout.js";
import StatCard      from "../components/demandes/StatCard.js";
import DashboardChart from "../components/demandes/DashboardChart.js";
import { SkeletonStat } from "../components/ui/SkeletonLoader.js";

// Niveaux de validation, ordre du circuit
const STAT_CARDS = [
  { title: "Validation GGR Local",  niveau: 1 },
  { title: "Validation DG Local",   niveau: 2 },
  { title: "Validation AWA",        niveau: 3 },
  { title: "Validation FO Group",   niveau: 4 },
  { title: "Validation GGR Group",  niveau: 5 },
  { title: "Clôturées",             niveau: 6 },
];

function extractCount(data) {
  return Number(
    data?.nombre_dmd ?? data?.count ?? data?.nb_demandes ?? data?.nombre ?? data?.nb ??
    (typeof data === "number" ? data : 0)
  ) || 0;
}

export default defineComponent({
  name: "StatistiquesPage",

  components: { AppLayout, StatCard, DashboardChart, SkeletonStat },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // Compteurs chargés pour le tableau récapitulatif
    const counts  = ref([]);
    const loading = ref(true);
    const error   = ref(null);

    const total = computed(() => counts.value.reduce((s, v) => s + v, 0));
    const rows = computed(() =>
      STAT_CARDS.map((c, i) => ({
        ...c,
        count: counts.value[i] ?? 0,
        pct: total.value ? Math.round(((counts.value[i] ?? 0) / total.value) * 100) : 0,
      }))
    );

    async function loadCounts() {
      loading.value = true;
      error.value = null;
      try {
        const results = await Promise.allSettled(
          STAT_CARDS.map((c) => apiGet(`/nombre_demandes/${c.niveau}`))
        );
        counts.value = results.map((r) =>
          r.status === "fulfilled" ? extractCount(r.value) : 0
        );
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await loadCounts();
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      statCards: STAT_CARDS,
      counts,
      loading,
      error,
      total,
      rows,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex-grow px-4 lg:px-8 py-6">
            <h4 class="py-4 mb-0 text-h4 font-bold">Statistiques</h4>
            <p class="mb-6 text-muted text-sm">Répartition des demandes par niveau de validation dans le circuit d'approbation.</p>

            <!-- Cartes de compteurs -->
            <div class="flex flex-wrap -mx-3 mb-6">
                <StatCard v-for="card in statCards" :key="card.niveau"
                          :title="card.title" :niveau="card.niveau" />
            </div>

            <!-- Graphique SVG -->
            <div class="flex flex-wrap -mx-3 mb-6">
                <DashboardChart :cards="statCards" :active-niveau="null" />
            </div>

            <!-- Tableau récapitulatif -->
            <div class="flex flex-wrap -mx-3">
                <div class="w-full px-3">
                    <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)]">
                        <div class="px-4 py-3 border-b border-line">
                            <h6 class="mb-0 text-[13px] font-bold text-ink">Tableau récapitulatif</h6>
                        </div>

                        <div v-if="loading" class="p-4 space-y-2 animate-pulse">
                            <div v-for="i in 6" :key="i" class="h-8 bg-[rgba(24,28,33,0.06)] rounded"></div>
                        </div>

                        <div v-else-if="error" class="p-4 text-danger text-sm">
                            Erreur lors du chargement : {{ error }}
                        </div>

                        <table v-else class="w-full text-base">
                            <thead>
                                <tr class="border-b border-line bg-[rgba(24,28,33,0.02)]">
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Niveau</th>
                                    <th class="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wide">Demandes</th>
                                    <th class="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wide w-[180px]">Répartition</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in rows" :key="row.niveau"
                                    class="border-b border-line last:border-0 hover:bg-brand-soft transition-colors duration-100">
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <span class="inline-flex items-center justify-center w-6 h-6 text-[11px] font-bold text-white bg-brand rounded-full shrink-0">{{ row.niveau }}</span>
                                            <span class="font-medium">{{ row.title }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-right font-semibold text-success">
                                        {{ row.count.toLocaleString('fr-FR') }}
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2 justify-end">
                                            <div class="flex-1 h-2 bg-[rgba(24,28,33,0.08)] rounded-full overflow-hidden max-w-[100px]">
                                                <div class="h-full bg-brand rounded-full transition-all duration-500"
                                                     :style="{ width: row.pct + '%' }"></div>
                                            </div>
                                            <span class="text-xs text-muted w-[32px] text-right">{{ row.pct }}%</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="rows.length" class="bg-[rgba(24,28,33,0.02)]">
                                    <td class="px-4 py-3 font-semibold">Total</td>
                                    <td class="px-4 py-3 text-right font-bold text-ink">{{ total.toLocaleString('fr-FR') }}</td>
                                    <td class="px-4 py-3 text-right text-xs text-muted">100 %</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </AppLayout>
  `,
});
