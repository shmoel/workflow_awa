/**
 * pages/DemandesValidationPage.js
 *
 * Composant "page" pour demandes_validation.html.
 * Interface du validateur AWA / DG Local (Niveau 3, hors AIG+GGR).
 *
 * ── Onglet 1 : "Demandes Introduites" ──────────────────────────────────────
 *   Endpoint : GET /demandes_a_valider/
 *   Colonnes : Type de demande | Banque | Contrepartie | Entité | Montant (Xof)
 *   Action   : [Evaluer] → valider_demande.html?id_dmd=X
 *
 * ── Onglet 2 : "Demandes en validation" ────────────────────────────────────
 *   Endpoint : GET /demandes_deja_valider/
 *   Colonnes : Type de demande | Banque | Contrepartie | Entité | Montant (Xof)
 *   Actions  : [Détails] → detail_consulter_demande.html?id_dmd=X
 *              [CHAT]    → chat.html?id_dmd=X
 *
 * ── Onglet 3 : "Demandes en fin de processus" ──────────────────────────────
 *   Endpoint : GET /demandes_fin_process/
 *   Colonnes : Entité | Type de demande | Contrepartie | Montant (Xof) |
 *              Date / Heure | Etat
 *   Etat     : max_event === 9 → badge "Arrêté" (rouge, désactivé)
 *              sinon           → badge "Terme"  (gris, désactivé)
 *   Action   : [Détails] uniquement (pas de CHAT sur cet onglet)
 *
 * Dépendances réutilisées sans modification :
 *   AppSidebar, AppNavbar, AppFooter, DemandesTable, DemandeFilters,
 *   useCurrentUser, useNotificationPolling
 *   (pas de ConfirmModal : aucune action destructive sur cette page)
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet }                     from "../services/api.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";

import AppSidebar     from "../components/layout/AppSidebar.js";
import AppNavbar      from "../components/layout/AppNavbar.js";
import AppFooter      from "../components/layout/AppFooter.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function goToEvaluer(id) {
  window.location.href = `valider_demande.html?id_dmd=${id}`;
}
function goToDetail(id) {
  window.location.href = `detail_consulter_demande.html?id_dmd=${id}`;
}
function goToChat(id) {
  window.location.href = `chat.html?id_dmd=${id}`;
}

// ---------------------------------------------------------------------------
// Colonnes par onglet
// ---------------------------------------------------------------------------

// Onglets 1 et 2 partagent les mêmes colonnes de données
const COLS_INTRO_VALID = [
  { key: "type_demande",      label: "Type de demande" },
  { key: "banque",            label: "Banque" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "categorie_demande", label: "Entité" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v) },
];

// Onglet 3 : colonnes différentes (Entité en premier, Date, Etat)
const COLS_FIN = [
  { key: "categorie_demande", label: "Entité" },
  { key: "type_demande",      label: "Type de demande" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v) },
  { key: "date_val",          label: "Date / Heure" },
  { key: "_etat",             label: "Etat" },
];

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const FILTER_FIELDS = [
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "montant",      placeholder: "Filtrer par Montant" },
];

const EMPTY_FILTERS = { type: "", banque: "", entite: "", contrepartie: "", montant: "" };

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "DemandesValidationPage",

  components: {
    AppSidebar,
    AppNavbar,
    AppFooter,
    DemandesTable,
    DemandeFilters,
  },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // ---- Onglet actif ----
    const activeTab = ref("intro");  // "intro" | "valid" | "fin"

    // ---- Données brutes ----
    const rowsIntro = ref([]);
    const rowsValid = ref([]);
    const rowsFin   = ref([]);

    const loadingIntro = ref(true);
    const loadingValid = ref(true);
    const loadingFin   = ref(true);

    const errorIntro = ref(null);
    const errorValid = ref(null);
    const errorFin   = ref(null);

    // ---- Filtres ----
    const filters = ref({ ...EMPTY_FILTERS });

    function applyFilters(rows) {
      const ty = filters.value.type.toLowerCase();
      const bq = filters.value.banque.toLowerCase();
      const en = filters.value.entite.toLowerCase();
      const co = filters.value.contrepartie.toLowerCase();
      const mo = filters.value.montant.toLowerCase();
      return rows.filter(
        (r) =>
          (r.type_demande      ?? "").toLowerCase().includes(ty) &&
          (r.banque            ?? "").toLowerCase().includes(bq) &&
          (r.categorie_demande ?? "").toLowerCase().includes(en) &&
          (r.nom_client        ?? "").toLowerCase().includes(co) &&
          String(r.montant ?? "").toLowerCase().includes(mo)
      );
    }

    const filteredIntro = computed(() => applyFilters(rowsIntro.value));
    const filteredValid = computed(() => applyFilters(rowsValid.value));
    const filteredFin   = computed(() => applyFilters(rowsFin.value));

    // ---- Chargements ----
    async function loadIntro() {
      loadingIntro.value = true;
      errorIntro.value = null;
      try {
        const data = await apiGet("/demandes_a_valider/");
        rowsIntro.value = data.results ?? [];
      } catch (e) {
        errorIntro.value = e.message;
      } finally {
        loadingIntro.value = false;
      }
    }

    async function loadValid() {
      loadingValid.value = true;
      errorValid.value = null;
      try {
        const data = await apiGet("/demandes_deja_valider/");
        rowsValid.value = data.results ?? [];
      } catch (e) {
        errorValid.value = e.message;
      } finally {
        loadingValid.value = false;
      }
    }

    async function loadFin() {
      loadingFin.value = true;
      errorFin.value = null;
      try {
        const data = await apiGet("/demandes_fin_process/");
        // Normalise le champ _etat calculé depuis max_event
        rowsFin.value = (data.results ?? []).map((r) => ({
          ...r,
          _etat: r.max_event === 9 ? "Arrêté" : "Terme",
        }));
      } catch (e) {
        errorFin.value = e.message;
      } finally {
        loadingFin.value = false;
      }
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await Promise.allSettled([loadIntro(), loadValid(), loadFin()]);
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      activeTab,
      filteredIntro, filteredValid, filteredFin,
      loadingIntro,  loadingValid,  loadingFin,
      errorIntro,    errorValid,    errorFin,
      filters,
      filterFields:    FILTER_FIELDS,
      colsIntroValid:  COLS_INTRO_VALID,
      colsFin:         COLS_FIN,
      goToEvaluer,
      goToDetail,
      goToChat,
    };
  },

  template: /* html */ `
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <!-- Sidebar — lien actif : valid_dmd -->
      <AppSidebar active-page="valid_dmd" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="MES DEMANDES" />

        <main class="flex-1 p-5" role="main">
          <div
            class="bg-white rounded-2xl shadow-sm border overflow-hidden"
            style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
          >

            <!-- ---- En-tête : filtres + onglets ---- -->
            <div
              class="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-0 border-b"
              style="border-color: var(--color-brand-border);"
            >
              <div class="pb-3">
                <DemandeFilters :fields="filterFields" v-model="filters" />
              </div>

              <div class="pb-0 overflow-x-auto">
                <ul class="flex list-none m-0 p-0 gap-1 whitespace-nowrap" role="tablist">

                  <li role="presentation">
                    <button
                      role="tab"
                      :aria-selected="activeTab === 'intro'"
                      @click="activeTab = 'intro'"
                      class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors focus:outline-none"
                      :style="activeTab === 'intro'
                        ? 'color: var(--color-brand); border-color: var(--color-brand);'
                        : 'color: var(--color-text-secondary); border-color: transparent;'"
                    >
                      Demandes Introduites
                    </button>
                  </li>

                  <li role="presentation">
                    <button
                      role="tab"
                      :aria-selected="activeTab === 'valid'"
                      @click="activeTab = 'valid'"
                      class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors focus:outline-none"
                      :style="activeTab === 'valid'
                        ? 'color: var(--color-brand); border-color: var(--color-brand);'
                        : 'color: var(--color-text-secondary); border-color: transparent;'"
                    >
                      Demandes en validation
                    </button>
                  </li>

                  <li role="presentation">
                    <button
                      role="tab"
                      :aria-selected="activeTab === 'fin'"
                      @click="activeTab = 'fin'"
                      class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors focus:outline-none"
                      :style="activeTab === 'fin'
                        ? 'color: var(--color-brand); border-color: var(--color-brand);'
                        : 'color: var(--color-text-secondary); border-color: transparent;'"
                    >
                      Demandes en fin de processus
                    </button>
                  </li>

                </ul>
              </div>
            </div>

            <!-- ============================================================
                 Onglet 1 — Demandes Introduites
                 Action : [Evaluer]
                 ============================================================ -->
            <div
              v-show="activeTab === 'intro'"
              role="tabpanel"
              aria-label="Demandes introduites à évaluer"
            >
              <DemandesTable
                :rows="filteredIntro"
                :columns="colsIntroValid"
                :loading="loadingIntro"
                :error="errorIntro"
                aria-label="Demandes introduites"
              >
                <template #actions="{ row }">
                  <button
                    @click="goToEvaluer(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-4 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Evaluer la demande ' + row.id_demande"
                  >
                    Evaluer
                  </button>
                </template>
              </DemandesTable>
            </div>

            <!-- ============================================================
                 Onglet 2 — Demandes en validation
                 Actions : [Détails] [CHAT]
                 ============================================================ -->
            <div
              v-show="activeTab === 'valid'"
              role="tabpanel"
              aria-label="Demandes en cours de validation"
            >
              <DemandesTable
                :rows="filteredValid"
                :columns="colsIntroValid"
                :loading="loadingValid"
                :error="errorValid"
                aria-label="Demandes en validation"
              >
                <template #actions="{ row }">
                  <button
                    @click="goToDetail(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: #334155; border-color: #334155; background: #fff;"
                    onmouseover="this.style.background='#334155';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='#334155';"
                    :aria-label="'Détails de la demande ' + row.id_demande"
                  >
                    Détails
                  </button>
                  <button
                    @click="goToChat(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Chat de la demande ' + row.id_demande"
                  >
                    CHAT
                  </button>
                </template>
              </DemandesTable>
            </div>

            <!-- ============================================================
                 Onglet 3 — Demandes en fin de processus
                 Etat  : badge Arrêté (rouge) ou Terme (gris), désactivé
                 Action : [Détails] uniquement — pas de CHAT sur cet onglet
                 ============================================================ -->
            <div
              v-show="activeTab === 'fin'"
              role="tabpanel"
              aria-label="Demandes en fin de processus"
            >
              <DemandesTable
                :rows="filteredFin"
                :columns="colsFin"
                :loading="loadingFin"
                :error="errorFin"
                aria-label="Demandes en fin de processus"
              >
                <template #actions="{ row }">
                  <!-- Badge Etat coloré (le champ _etat est déjà affiché en colonne,
                       on ajoute ici le bouton Détails uniquement) -->
                  <button
                    @click="goToDetail(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: #334155; border-color: #334155; background: #fff;"
                    onmouseover="this.style.background='#334155';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='#334155';"
                    :aria-label="'Détails de la demande ' + row.id_demande"
                  >
                    Détails
                  </button>
                </template>
              </DemandesTable>
            </div>

          </div>
        </main>

        <AppFooter />
      </div>

      <!-- ================================================================
           Popup notification (polling)
           ================================================================ -->
      <Transition name="fade">
        <div
          v-if="polling.show.value"
          class="fixed inset-0 z-50 flex items-start justify-center"
          style="background: rgba(0,0,0,0.35);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-notif-val"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-notif-val"
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
