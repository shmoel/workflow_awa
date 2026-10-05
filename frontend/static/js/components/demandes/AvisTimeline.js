/**
 * components/demandes/AvisTimeline.js
 *
 * Historique des avis d'une demande, affiché en accordéon (un panneau par avis).
 *
 * Remplace le HTML généré par charger_details_commentaire() dans
 * detail_consulter_demande.html. Réutilisable par la page chat.
 *
 * Props :
 *   avis : Array — lignes de GET /commentaires_demande/{id}, ordre chronologique
 *          { nom, prenom, banque, entite, decision, commentaire,
 *            event_d, statut_d, date_time }
 *
 * Comportement :
 *   - Un seul panneau ouvert à la fois ; le dernier avis est ouvert par défaut
 *     (décision du 05/10/2026)
 *   - Panneaux identifiés par leur position : le legacy utilisait event_d,
 *     deux avis du même type s'ouvraient donc ensemble
 *   - Aucun v-html : l'interpolation Vue échappe tout le contenu
 */

import {
  defineComponent,
  ref,
  watch,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

// ---------------------------------------------------------------------------
// Couleur de la pastille selon la décision (tokens.css)
// ---------------------------------------------------------------------------
const DECISION_COLORS = {
  "Validée":    "var(--color-status-validated)",
  "Rejetée":    "var(--color-status-rejected)",
  "En attente": "var(--color-status-pending)",
};

/**
 * Formate le timestamp renvoyé par l'API ("2026-09-04T11:00:00")
 * en "04/09/2026 11:00". Retourne la valeur brute si elle n'est pas une date.
 * @param {string} value
 * @returns {string}
 */
function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default defineComponent({
  name: "AvisTimeline",

  props: {
    avis: {
      type: Array,
      default: () => [],
    },
  },

  setup(props) {
    /** Index du panneau ouvert (null = tous fermés) */
    const openIndex = ref(null);

    // Ouvre le dernier avis à chaque chargement de la liste
    watch(
      () => props.avis,
      (list) => { openIndex.value = list.length ? list.length - 1 : null; },
      { immediate: true }
    );

    function toggle(i) {
      openIndex.value = openIndex.value === i ? null : i;
    }

    function decisionColor(decision) {
      return DECISION_COLORS[decision] ?? "var(--color-status-pending)";
    }

    return { openIndex, toggle, decisionColor, formatDateTime };
  },

  template: /* html */ `
    <p v-if="!avis.length" class="text-sm py-4" style="color: var(--color-text-secondary);">
      Aucun avis enregistré pour cette demande.
    </p>

    <ol v-else class="list-none m-0 p-0 space-y-2" aria-label="Historique des avis">
      <li
        v-for="(row, i) in avis"
        :key="i"
        class="bg-white rounded-xl border overflow-hidden"
        style="border-color: var(--color-brand-border);"
      >
        <h3 class="m-0">
          <button
            type="button"
            class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm focus:outline-none"
            :aria-expanded="openIndex === i"
            :aria-controls="'avis-panel-' + i"
            :id="'avis-header-' + i"
            @click="toggle(i)"
          >
            <span class="flex items-center gap-3 min-w-0">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ background: decisionColor(row.decision) }"
                aria-hidden="true"
              ></span>
              <span class="font-semibold truncate">{{ row.statut_d || row.event_d || '—' }}</span>
              <span class="truncate" style="color: var(--color-text-secondary);">: {{ row.decision || '—' }}</span>
            </span>
            <span class="flex items-center gap-3 flex-shrink-0">
              <span class="text-xs whitespace-nowrap" style="color: var(--color-text-secondary);">
                {{ formatDateTime(row.date_time) }}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform"
                   :class="{ 'rotate-180': openIndex === i }"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
        </h3>

        <div
          v-show="openIndex === i"
          :id="'avis-panel-' + i"
          role="region"
          :aria-labelledby="'avis-header-' + i"
          class="px-4 pb-4 border-t"
          style="border-color: var(--color-brand-border);"
        >
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm pt-3 m-0">
            <div class="flex gap-2"><dt class="font-semibold w-24 flex-shrink-0">Nom</dt><dd class="m-0">{{ row.nom || '—' }}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold w-24 flex-shrink-0">Prénom</dt><dd class="m-0">{{ row.prenom || '—' }}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold w-24 flex-shrink-0">Banque</dt><dd class="m-0">{{ row.banque || '—' }}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold w-24 flex-shrink-0">Entité</dt><dd class="m-0">{{ row.entite || '—' }}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold w-24 flex-shrink-0">Décision</dt><dd class="m-0">{{ row.decision || '—' }}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold w-24 flex-shrink-0">Date heure</dt><dd class="m-0">{{ formatDateTime(row.date_time) }}</dd></div>
          </dl>
          <div class="mt-3">
            <p class="text-sm font-semibold mb-1">Commentaire</p>
            <p
              class="text-sm whitespace-pre-wrap rounded-lg px-3 py-2 m-0"
              style="background: var(--color-bg-page); color: var(--color-text-primary);"
            >{{ row.commentaire || 'Aucun commentaire.' }}</p>
          </div>
        </div>
      </li>
    </ol>
  `,
});
