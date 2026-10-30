/**
 * pages/StatistiquesPage.js
 *
 * Page Statistiques — répartition des demandes par niveau de validation.
 *
 * Visualisations (SVG pur, aucune librairie externe) :
 *   - Donut chart : proportions visuelles de chaque niveau
 *   - Bar chart horizontal : valeurs absolues triées
 *   - Tableau récapitulatif : compteurs + barres de progression + %
 *
 * Un seul jeu d'appels API (6 × GET /nombre_demandes/{niveau}),
 * partagé par les deux graphiques.
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

// ---- Palettes et données -----------------------------------------------

const STAT_CARDS = [
  { title: "GGR Local",   niveau: 1, color: "#ea580c" },
  { title: "DG Local",    niveau: 2, color: "#f97316" },
  { title: "AWA",         niveau: 3, color: "#fb923c" },
  { title: "FO Group",    niveau: 4, color: "#fdba74" },
  { title: "GGR Group",   niveau: 5, color: "#c2410c" },
  { title: "Clôturées",   niveau: 6, color: "#22c55e" },
];

function extractCount(data) {
  return Number(
    data?.nombre_dmd ?? data?.count ?? data?.nb_demandes ?? data?.nombre ?? data?.nb ??
    (typeof data === "number" ? data : 0)
  ) || 0;
}

// ---- Utilitaires SVG donut ----------------------------------------------

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const gap = 1.2; // degrés de séparation entre segments
  const s = startDeg + gap / 2;
  const e = endDeg   - gap / 2;
  if (e - s < 0.5) return "";
  const large = e - s > 180 ? 1 : 0;
  const o1 = polarToXY(cx, cy, outerR, s);
  const o2 = polarToXY(cx, cy, outerR, e);
  const i1 = polarToXY(cx, cy, innerR, e);
  const i2 = polarToXY(cx, cy, innerR, s);
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

// ---- Composant ----------------------------------------------------------

export default defineComponent({
  name: "StatistiquesPage",

  components: { AppLayout },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    const counts  = ref([]);
    const loading = ref(true);
    const error   = ref(null);
    const hovered = ref(null); // index du segment survolé

    const total = computed(() => counts.value.reduce((s, v) => s + v, 0));

    // ---- Lignes du tableau récapitulatif ----
    const rows = computed(() =>
      STAT_CARDS.map((c, i) => ({
        ...c,
        count: counts.value[i] ?? 0,
        pct: total.value ? Math.round(((counts.value[i] ?? 0) / total.value) * 1000) / 10 : 0,
      }))
    );

    // ---- Segments du donut ----
    const donutSlices = computed(() => {
      if (!total.value) return [];
      let angle = 0;
      return STAT_CARDS.map((c, i) => {
        const count = counts.value[i] ?? 0;
        const sweep = (count / total.value) * 360;
        const start = angle;
        angle += sweep;
        return {
          ...c,
          index: i,
          count,
          pct: total.value ? Math.round((count / total.value) * 1000) / 10 : 0,
          path: donutPath(100, 100, count > 0 ? (hovered.value === i ? 86 : 82) : 0, 54, start, angle),
          labelPos: polarToXY(100, 100, 69, start + sweep / 2),
          sweep,
        };
      }).filter(s => s.count > 0);
    });

    // Segment actif (survolé) pour l'info centrale
    const activeSlice = computed(() =>
      hovered.value !== null ? (STAT_CARDS[hovered.value] ? {
        ...STAT_CARDS[hovered.value],
        count: counts.value[hovered.value] ?? 0,
        pct: total.value ? Math.round(((counts.value[hovered.value] ?? 0) / total.value) * 1000) / 10 : 0,
      } : null) : null
    );

    // ---- Bar chart horizontal ----
    const BAR_W = 220; // largeur max d'une barre
    const bars = computed(() =>
      rows.value.map((r) => ({
        ...r,
        barW: total.value ? Math.max(2, (r.count / total.value) * BAR_W) : 0,
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
      user, polling,
      counts, loading, error,
      total, rows, bars,
      donutSlices, activeSlice,
      hovered,
      STAT_CARDS,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex-grow px-4 lg:px-8 py-6">

            <h4 class="py-4 mb-1 text-h4 font-bold">Statistiques</h4>
            <p class="mb-6 text-muted text-sm">Répartition des demandes dans le circuit de validation.</p>

            <!-- ===== Skeleton ===== -->
            <div v-if="loading" class="flex flex-wrap -mx-3">
                <div class="w-full lg:w-1/2 px-3 mb-4">
                    <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)] p-6 flex items-center justify-center h-[300px] animate-pulse">
                        <div class="w-48 h-48 rounded-full bg-[rgba(24,28,33,0.06)] ring-[28px] ring-[rgba(24,28,33,0.04)]"></div>
                    </div>
                </div>
                <div class="w-full lg:w-1/2 px-3 mb-4">
                    <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)] p-6 space-y-3 animate-pulse">
                        <div v-for="i in 6" :key="i" class="flex items-center gap-3">
                            <div class="w-24 h-3 bg-[rgba(24,28,33,0.06)] rounded"></div>
                            <div class="flex-1 h-6 bg-[rgba(24,28,33,0.06)] rounded" :style="{ maxWidth: (40 + i * 20) + 'px' }"></div>
                            <div class="w-10 h-3 bg-[rgba(24,28,33,0.06)] rounded"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== Erreur ===== -->
            <div v-else-if="error" class="px-3 py-4 text-danger text-sm">
                Erreur lors du chargement : {{ error }}
            </div>

            <!-- ===== Graphiques côte à côte ===== -->
            <div v-else class="flex flex-wrap -mx-3">

                <!-- Donut -->
                <div class="w-full lg:w-1/2 px-3 mb-4">
                    <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)] p-5 h-full">
                        <h6 class="text-[13px] font-bold text-ink mb-4">Proportions</h6>
                        <div class="flex flex-col sm:flex-row items-center gap-6">

                            <!-- SVG donut -->
                            <svg viewBox="0 0 200 200" class="w-[180px] h-[180px] shrink-0" aria-hidden="true">
                                <g v-for="(s, i) in donutSlices" :key="s.niveau"
                                   @mouseenter="hovered = i" @mouseleave="hovered = null"
                                   class="cursor-pointer transition-all duration-150">
                                    <path :d="s.path" :fill="s.color"
                                          :opacity="hovered === null || hovered === i ? 1 : 0.45"
                                          class="transition-all duration-150" />
                                    <text v-if="s.sweep > 20"
                                          :x="s.labelPos.x" :y="s.labelPos.y + 4"
                                          text-anchor="middle" font-size="9" font-weight="600" fill="white">
                                        {{ s.pct }}%
                                    </text>
                                </g>
                                <!-- Texte central : total ou niveau survolé -->
                                <text x="100" y="93" text-anchor="middle" font-size="22" font-weight="700"
                                      :fill="activeSlice ? activeSlice.color : '#212529'">
                                    {{ activeSlice ? activeSlice.count.toLocaleString('fr-FR') : total.toLocaleString('fr-FR') }}
                                </text>
                                <text x="100" y="112" text-anchor="middle" font-size="9" fill="rgba(24,28,33,0.5)">
                                    {{ activeSlice ? activeSlice.title : 'total' }}
                                </text>
                            </svg>

                            <!-- Légende -->
                            <ul class="flex flex-col gap-[6px] text-sm min-w-0">
                                <li v-for="(r, i) in rows" :key="r.niveau"
                                    class="flex items-center gap-2 cursor-pointer transition-opacity duration-100 min-w-0"
                                    :class="hovered !== null && hovered !== i ? 'opacity-40' : ''"
                                    @mouseenter="hovered = i" @mouseleave="hovered = null">
                                    <span class="inline-block w-3 h-3 rounded-sm shrink-0" :style="{ background: r.color }"></span>
                                    <span class="truncate text-ink leading-tight">{{ r.title }}</span>
                                    <span class="ml-auto shrink-0 text-xs text-muted">{{ r.count.toLocaleString('fr-FR') }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Bar chart horizontal -->
                <div class="w-full lg:w-1/2 px-3 mb-4">
                    <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)] p-5 h-full">
                        <h6 class="text-[13px] font-bold text-ink mb-4">Valeurs absolues</h6>
                        <div class="flex flex-col gap-3">
                            <div v-for="(b, i) in bars" :key="b.niveau"
                                 class="flex items-center gap-3 cursor-pointer transition-opacity duration-100"
                                 :class="hovered !== null && hovered !== i ? 'opacity-40' : ''"
                                 @mouseenter="hovered = i" @mouseleave="hovered = null">
                                <!-- Label niveau -->
                                <div class="flex items-center gap-2 w-[110px] shrink-0">
                                    <span class="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full shrink-0"
                                          :style="{ background: b.color }">{{ b.niveau }}</span>
                                    <span class="text-xs text-ink truncate">{{ b.title }}</span>
                                </div>
                                <!-- Barre -->
                                <div class="flex-1 h-5 bg-[rgba(24,28,33,0.05)] rounded overflow-hidden">
                                    <div class="h-full rounded transition-[width] duration-500"
                                         :style="{ width: total ? (b.count / total * 100) + '%' : '0%', background: b.color }"></div>
                                </div>
                                <!-- Valeur -->
                                <span class="text-xs font-semibold w-[36px] text-right shrink-0"
                                      :style="{ color: b.color }">
                                    {{ b.count.toLocaleString('fr-FR') }}
                                </span>
                            </div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-line flex justify-between text-xs text-muted">
                            <span>Total</span>
                            <span class="font-bold text-ink">{{ total.toLocaleString('fr-FR') }} demandes</span>
                        </div>
                    </div>
                </div>

                <!-- Tableau récapitulatif -->
                <div class="w-full px-3 mt-2">
                    <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)]">
                        <div class="px-4 py-3 border-b border-line">
                            <h6 class="mb-0 text-[13px] font-bold text-ink">Tableau récapitulatif</h6>
                        </div>
                        <table class="w-full text-base">
                            <thead>
                                <tr class="border-b border-line bg-[rgba(24,28,33,0.02)]">
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Niveau</th>
                                    <th class="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wide">Demandes</th>
                                    <th class="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wide w-[200px]">Répartition</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(r, i) in rows" :key="r.niveau"
                                    class="border-b border-line last:border-0 transition-colors duration-100 cursor-pointer"
                                    :class="hovered !== null && hovered !== i ? 'opacity-40' : 'hover:bg-brand-soft'"
                                    @mouseenter="hovered = i" @mouseleave="hovered = null">
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <span class="inline-flex items-center justify-center w-6 h-6 text-[11px] font-bold text-white rounded-full shrink-0"
                                                  :style="{ background: r.color }">{{ r.niveau }}</span>
                                            <span class="font-medium">Validation {{ r.title }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-right font-semibold" :style="{ color: r.color }">
                                        {{ r.count.toLocaleString('fr-FR') }}
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2 justify-end">
                                            <div class="flex-1 h-2 bg-[rgba(24,28,33,0.08)] rounded-full overflow-hidden max-w-[110px]">
                                                <div class="h-full rounded-full transition-all duration-500"
                                                     :style="{ width: r.pct + '%', background: r.color }"></div>
                                            </div>
                                            <span class="text-xs text-muted w-[40px] text-right">{{ r.pct }}%</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr class="bg-[rgba(24,28,33,0.02)]">
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
