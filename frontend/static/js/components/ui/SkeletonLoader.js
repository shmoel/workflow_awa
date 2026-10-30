/**
 * components/ui/SkeletonLoader.js
 *
 * Composants skeleton (squelette) pour afficher des placeholders pendant le chargement.
 * Améliore la perception de performance et évite les "sauts" de contenu.
 *
 * Composants disponibles:
 * - SkeletonText: Ligne de texte
 * - SkeletonCard: Carte complète
 * - SkeletonTable: Tableau avec lignes
 * - SkeletonStat: Carte de statistique
 *
 * Props communes:
 *   count: Nombre d'éléments à répéter
 *   className: Classes CSS additionnelles
 */

import { defineComponent } from "vue";

// Classes d'animation du pulse
const PULSE = "animate-pulse bg-gray-200 rounded";

/**
 * SkeletonText - Ligne de texte skeleton
 */
export const SkeletonText = defineComponent({
  name: "SkeletonText",

  props: {
    width: { type: String, default: "100%" },
    height: { type: String, default: "1rem" },
    className: { type: String, default: "" },
  },

  template: /* html */ `
    <div
      :class="'inline-block ' + PULSE + ' ' + className"
      :style="{ width, height }"
    ></div>
  `,

  setup() {
    return { PULSE };
  },
});

/**
 * SkeletonCard - Carte skeleton
 */
export const SkeletonCard = defineComponent({
  name: "SkeletonCard",

  components: { SkeletonText },

  props: {
    withImage: { type: Boolean, default: false },
    className: { type: String, default: "" },
  },

  template: /* html */ `
    <div :class="'p-6 bg-white border border-line rounded-lg shadow-sm ' + className">
      <div v-if="withImage" :class="'w-full h-48 mb-4 ' + PULSE"></div>
      <SkeletonText height="1.5rem" width="60%" class="mb-3" />
      <SkeletonText height="1rem" width="100%" class="mb-2" />
      <SkeletonText height="1rem" width="90%" class="mb-2" />
      <SkeletonText height="1rem" width="70%" />
    </div>
  `,

  setup() {
    return { PULSE };
  },
});

/**
 * SkeletonTable - Tableau skeleton
 */
export const SkeletonTable = defineComponent({
  name: "SkeletonTable",

  components: { SkeletonText },

  props: {
    rows: { type: Number, default: 5 },
    columns: { type: Number, default: 4 },
    className: { type: String, default: "" },
  },

  template: /* html */ `
    <div :class="'overflow-hidden bg-white border border-line rounded-lg ' + className">
      <!-- En-tête -->
      <div class="flex gap-4 px-4 py-3 bg-gray-50 border-b border-line">
        <SkeletonText
          v-for="col in columns"
          :key="'header-' + col"
          width="100px"
          height="1rem"
          class="flex-1"
        />
      </div>

      <!-- Lignes -->
      <div
        v-for="row in rows"
        :key="'row-' + row"
        class="flex gap-4 px-4 py-3 border-b border-line last:border-b-0"
      >
        <SkeletonText
          v-for="col in columns"
          :key="'row-' + row + '-col-' + col"
          :width="col === 1 ? '120px' : col === columns ? '80px' : '100%'"
          height="0.875rem"
          class="flex-1"
        />
      </div>
    </div>
  `,

  setup() {
    return { PULSE };
  },
});

/**
 * SkeletonStat - Carte de statistique skeleton
 */
export const SkeletonStat = defineComponent({
  name: "SkeletonStat",

  components: { SkeletonText },

  props: {
    className: { type: String, default: "" },
  },

  template: /* html */ `
    <div :class="'p-6 bg-white border border-line rounded-lg shadow-sm ' + className">
      <div class="flex items-start justify-between mb-4">
        <SkeletonText width="80px" height="1rem" />
        <div :class="'w-12 h-12 rounded-full ' + PULSE"></div>
      </div>
      <SkeletonText width="60px" height="2rem" class="mb-2" />
      <SkeletonText width="100px" height="0.75rem" />
    </div>
  `,

  setup() {
    return { PULSE };
  },
});

/**
 * SkeletonList - Liste skeleton
 */
export const SkeletonList = defineComponent({
  name: "SkeletonList",

  components: { SkeletonText },

  props: {
    items: { type: Number, default: 3 },
    withAvatar: { type: Boolean, default: false },
    className: { type: String, default: "" },
  },

  template: /* html */ `
    <div :class="'space-y-4 ' + className">
      <div
        v-for="item in items"
        :key="'item-' + item"
        class="flex items-start gap-3"
      >
        <div
          v-if="withAvatar"
          :class="'shrink-0 w-10 h-10 rounded-full ' + PULSE"
        ></div>
        <div class="flex-1 space-y-2">
          <SkeletonText width="40%" height="1rem" />
          <SkeletonText width="100%" height="0.875rem" />
          <SkeletonText width="60%" height="0.875rem" />
        </div>
      </div>
    </div>
  `,

  setup() {
    return { PULSE };
  },
});

/**
 * Composant principal qui exporte tous les skeletons
 */
export default defineComponent({
  name: "SkeletonLoader",

  components: {
    SkeletonText,
    SkeletonCard,
    SkeletonTable,
    SkeletonStat,
    SkeletonList,
  },

  props: {
    type: {
      type: String,
      default: "text",
      validator: (value) => ["text", "card", "table", "stat", "list"].includes(value),
    },
    count: { type: Number, default: 1 },
  },

  template: /* html */ `
    <template v-if="type === 'text'">
      <SkeletonText v-for="i in count" :key="i" />
    </template>
    <template v-else-if="type === 'card'">
      <SkeletonCard v-for="i in count" :key="i" />
    </template>
    <template v-else-if="type === 'table'">
      <SkeletonTable />
    </template>
    <template v-else-if="type === 'stat'">
      <SkeletonStat v-for="i in count" :key="i" />
    </template>
    <template v-else-if="type === 'list'">
      <SkeletonList />
    </template>
  `,
});
