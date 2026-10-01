/**
 * components/demandes/StatCard.js
 *
 * Carte de compteur de demandes par niveau de validation.
 *
 * Reproduit à l'identique les 6 cartes de l'accueil legacy :
 *   Validation GGR Local / Clôturées / Validation FO Group /
 *   Validation DG Local / Validation AWA / Validation GGR Group
 *
 * Props :
 *   title   : string  — libellé de la carte  (ex: "Validation AWA")
 *   niveau  : number  — id niveau API (1→GGRL, 2→DGL, 3→AWA, 4→FOG, 5→GGRG, 6→DC)
 *
 * Cycle de vie :
 *   - Charge le compteur via GET /nombre_demandes/{niveau} au montage
 *   - Gère les états loading / erreur / valeur
 *
 * Pas de dépendance externe en dehors de Vue 3 CDN et api.js.
 */

import { defineComponent, ref, onMounted } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { apiGet } from "../../services/api.js";

export default defineComponent({
  name: "StatCard",

  props: {
    /** Libellé affiché dans le titre de la carte */
    title: {
      type: String,
      required: true,
    },
    /**
     * Niveau de validation côté API.
     * 1 = GGR Local, 2 = DG Local, 3 = AWA, 4 = FO Group, 5 = GGR Group, 6 = Clôturées
     */
    niveau: {
      type: Number,
      required: true,
    },
  },

  setup(props) {
    const count = ref(null);   // null = pas encore chargé
    const loading = ref(true);
    const hasError = ref(false);

    /** Extrait le nombre depuis la réponse API quelle que soit la clé retournée */
    function _extractCount(data) {
      return Number(
        data?.nombre_dmd ??
        data?.count ??
        data?.nb_demandes ??
        data?.nombre ??
        data?.nb ??
        (typeof data === "number" ? data : 0)
      ) || 0;
    }

    onMounted(async () => {
      try {
        const data = await apiGet(`/nombre_demandes/${props.niveau}`);
        count.value = _extractCount(data);
      } catch (e) {
        console.error(`[StatCard niveau=${props.niveau}]`, e.message);
        hasError.value = true;
      } finally {
        loading.value = false;
      }
    });

    return { count, loading, hasError };
  },

  template: /* html */ `
    <article
      class="bg-white rounded-2xl border p-5 relative overflow-visible transition-all duration-200
             hover:-translate-y-0.5 hover:shadow-lg cursor-default"
      style="
        border-color: var(--color-brand-border);
        box-shadow: var(--color-shadow-card);
        font-family: var(--font-family-base);
      "
      :aria-label="title"
    >
      <!-- Pastille décorative (reprend le ::before legacy) -->
      <span
        class="absolute -top-4 left-4 w-9 h-9 rounded-full"
        style="background: #fff7f0; box-shadow: 0 2px 8px #ea580c22;"
        aria-hidden="true"
      ></span>

      <!-- Titre -->
      <h5
        class="font-bold text-sm tracking-wide mb-2"
        style="color: var(--color-brand);"
      >
        {{ title }}
      </h5>

      <!-- Compteur -->
      <p
        class="text-3xl font-extrabold leading-tight"
        style="color: #1a1a1a;"
        aria-live="polite"
      >
        <!-- Chargement -->
        <span v-if="loading" class="text-2xl animate-pulse" style="color: var(--color-text-muted);">…</span>

        <!-- Erreur -->
        <span v-else-if="hasError" style="color: var(--color-status-rejected); font-size:1.1rem;">
          Indisponible
        </span>

        <!-- Valeur -->
        <span v-else>
          {{ count !== null ? count.toLocaleString('fr-FR') : '—' }}
        </span>
      </p>
    </article>
  `,
});
