/**
 * components/ui/ProgressBar.js
 *
 * Barre de progression globale en haut de la page.
 * Indique le chargement des requêtes API ou d'autres opérations asynchrones.
 *
 * Props:
 *   show: Afficher la barre
 *   progress: Progression en pourcentage (0-100)
 *   indeterminate: Mode indéterminé (animation continue)
 *   color: Couleur de la barre (brand, success, danger, warning, info)
 *
 * Usage:
 * ```js
 * <ProgressBar :show="loading" :progress="50" />
 * <ProgressBar :show="loading" indeterminate />
 * ```
 */

import { defineComponent, computed } from "vue";

const COLORS = {
  brand: "bg-brand",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-[#f59e0b]",
  info: "bg-[#3b82f6]",
};

export default defineComponent({
  name: "ProgressBar",

  props: {
    show: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    indeterminate: { type: Boolean, default: false },
    color: { type: String, default: "brand" },
  },

  setup(props) {
    const progressStyle = computed(() => {
      if (props.indeterminate) {
        return {};
      }
      const percentage = Math.max(0, Math.min(100, props.progress));
      return { width: `${percentage}%` };
    });

    const colorClass = computed(() => COLORS[props.color] || COLORS.brand);

    return { progressStyle, colorClass };
  },

  template: /* html */ `
    <div
      v-if="show"
      class="fixed top-0 left-0 right-0 h-1 z-[10000] overflow-hidden"
    >
      <div
        :class="[
          'h-full transition-all duration-300 ease-out',
          colorClass,
          indeterminate && 'animate-progress-indeterminate'
        ]"
        :style="progressStyle"
      ></div>
    </div>
  `,
});
