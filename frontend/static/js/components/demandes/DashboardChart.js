/**
 * components/demandes/DashboardChart.js
 *
 * Histogramme SVG inline — répartition des demandes par niveau de validation.
 * Charge les 6 compteurs en parallèle (mêmes routes que StatCard).
 * Aucune librairie externe — SVG pur + Vue 3.
 *
 * Props :
 *   cards : Array<{ title, niveau }> — liste des niveaux à afficher
 *   activeNiveau : Number | null — niveau actuellement filtré (barre mise en avant)
 *
 * Émet :
 *   select(niveau) — clic sur une barre
 */

import { defineComponent, ref, computed, onMounted } from "vue";
import { apiGet } from "../../services/api.js";

function extractCount(data) {
  return Number(
    data?.nombre_dmd ?? data?.count ?? data?.nb_demandes ?? data?.nombre ?? data?.nb ??
    (typeof data === "number" ? data : 0)
  ) || 0;
}

const SVG_W = 600;
const SVG_H = 200;
const PAD   = { top: 20, right: 16, bottom: 48, left: 40 };
const CHART_W = SVG_W - PAD.left - PAD.right;
const CHART_H = SVG_H - PAD.top  - PAD.bottom;

export default defineComponent({
  name: "DashboardChart",

  props: {
    cards:        { type: Array,  required: true },
    activeNiveau: { type: Number, default: null },
  },

  emits: ["select"],

  setup(props) {
    const counts  = ref([]); // Array<number>
    const loading = ref(true);

    onMounted(async () => {
      const results = await Promise.allSettled(
        props.cards.map((c) => apiGet(`/nombre_demandes/${c.niveau}`))
      );
      counts.value = results.map((r) =>
        r.status === "fulfilled" ? extractCount(r.value) : 0
      );
      loading.value = false;
    });

    const maxCount = computed(() => Math.max(...counts.value, 1));

    const bars = computed(() =>
      props.cards.map((card, i) => {
        const count  = counts.value[i] ?? 0;
        const barH   = Math.max(2, (count / maxCount.value) * CHART_H);
        const barW   = (CHART_W / props.cards.length) * 0.65;
        const gap    = CHART_W / props.cards.length;
        const x      = PAD.left + gap * i + (gap - barW) / 2;
        const y      = PAD.top  + CHART_H - barH;
        const active = props.activeNiveau === card.niveau;
        return { card, count, barH, barW, x, y, active };
      })
    );

    // Labels tronqués pour l'axe X
    function shortLabel(title) {
      const parts = title.split(" ");
      return parts[parts.length - 1]; // dernier mot : "Local", "AWA", "Group"…
    }

    // Graduation Y : 0, max/2, max
    const yTicks = computed(() => {
      const m = maxCount.value;
      return [0, Math.round(m / 2), m].map((v) => ({
        value: v,
        y: PAD.top + CHART_H - (v / m) * CHART_H,
        label: v.toLocaleString("fr-FR"),
      }));
    });

    return { bars, yTicks, loading, SVG_W, SVG_H, PAD, CHART_H, shortLabel };
  },

  template: /* html */ `
    <div class="relative w-full px-3 mb-4">
        <div class="bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)] px-4 pt-4 pb-2">
            <h6 class="text-[13px] font-bold text-ink mb-2">Répartition des demandes par niveau</h6>

            <!-- Skeleton -->
            <div v-if="loading" class="flex items-end gap-2 h-[200px] px-10 pb-10 animate-pulse">
                <div v-for="i in 6" :key="i" class="flex-1 bg-[rgba(24,28,33,0.08)] rounded-t"
                     :style="{ height: (30 + i * 15) + 'px' }"></div>
            </div>

            <!-- Graphique -->
            <svg v-else :viewBox="'0 0 ' + SVG_W + ' ' + SVG_H" class="w-full" role="img" aria-label="Histogramme des demandes par niveau de validation">

                <!-- Grille horizontale -->
                <line v-for="tick in yTicks" :key="tick.value"
                      :x1="PAD.left" :y1="tick.y" :x2="SVG_W - PAD.right" :y2="tick.y"
                      stroke="rgba(24,28,33,0.08)" stroke-width="1" />

                <!-- Labels axe Y -->
                <text v-for="tick in yTicks" :key="'yl' + tick.value"
                      :x="PAD.left - 6" :y="tick.y + 4" text-anchor="end"
                      font-size="10" fill="rgba(24,28,33,0.45)">{{ tick.label }}</text>

                <!-- Barres -->
                <g v-for="bar in bars" :key="bar.card.niveau" @click="$emit('select', bar.card.niveau)"
                   class="cursor-pointer" role="button" :aria-label="bar.card.title + ' : ' + bar.count">
                    <!-- Zone de clic élargie -->
                    <rect :x="bar.x - 4" :y="PAD.top" :width="bar.barW + 8" :height="CHART_H"
                          fill="transparent" />
                    <!-- Barre principale -->
                    <rect :x="bar.x" :y="bar.y" :width="bar.barW" :height="bar.barH"
                          :fill="bar.active ? '#ff4a00' : '#ea580c'"
                          :opacity="bar.active ? 1 : 0.65"
                          rx="3" ry="3"
                          class="transition-all duration-200 hover:opacity-100" />
                    <!-- Valeur au-dessus de la barre -->
                    <text :x="bar.x + bar.barW / 2" :y="bar.y - 4" text-anchor="middle"
                          font-size="11" font-weight="600"
                          :fill="bar.active ? '#ff4a00' : 'rgba(24,28,33,0.7)'">
                        {{ bar.count.toLocaleString('fr-FR') }}
                    </text>
                    <!-- Label axe X -->
                    <text :x="bar.x + bar.barW / 2" :y="SVG_H - PAD.bottom + 14" text-anchor="middle"
                          font-size="10" fill="rgba(24,28,33,0.55)">
                        {{ shortLabel(bar.card.title) }}
                    </text>
                    <text :x="bar.x + bar.barW / 2" :y="SVG_H - PAD.bottom + 26" text-anchor="middle"
                          font-size="9" fill="rgba(24,28,33,0.4)">
                        niv.{{ bar.card.niveau }}
                    </text>
                </g>

                <!-- Axe X (baseline) -->
                <line :x1="PAD.left" :y1="PAD.top + CHART_H" :x2="SVG_W - PAD.right" :y2="PAD.top + CHART_H"
                      stroke="rgba(24,28,33,0.15)" stroke-width="1.5" />
            </svg>
        </div>
    </div>
  `,
});
