/**
 * pages/GgrgValidationPage.js
 *
 * Composant "page" pour ggrg_demandes_validation.html.
 * Interface du validateur GGR Group (Niveau 3 — banque AIG, entité GGR).
 *
 * ── Onglet 1 : "Demandes Introduites" ──────────────────────────────────────
 *   Endpoint : GET /demandes_a_valider/
 *   Colonnes : Type de demande | Banque | Entité | Contrepartie | Montant (Xof)
 *   Action   : [Evaluer] → valider_demande.html?id_dmd=X
 *
 * ── Onglet 2 : "Demandes fin de processus" ─────────────────────────────────
 *   Endpoint : GET /demandes_a_cloturer/
 *   Colonnes : Type de demande | Filiale (= banque) | Contrepartie |
 *              Entité | Montant (Xof)
 *   Actions  : [Détails] → detail_consulter_demande.html?id_dmd=X
 *              [Cloturer] → ouvre ConfirmModal avec commentaire
 *                         → POST /cloturer_demande/{id} (FormData)
 *
 * ── Correction bug legacy ───────────────────────────────────────────────────
 *   Dans confirmSubmission() du legacy, le header Authorization était passé
 *   en dehors de l'objet `headers: {}` (directement dans les options fetch),
 *   ce qui le rendait silencieusement ignoré. Corrigé ici via apiPostForm().
 *
 * Dépendances réutilisées sans modification :
 *   AppSidebar, AppNavbar, AppFooter, DemandesTable, DemandeFilters,
 *   ConfirmModal, useCurrentUser, useNotificationPolling
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPostForm }        from "../services/api.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";

import AppSidebar     from "../components/layout/AppSidebar.js";
import AppNavbar      from "../components/layout/AppNavbar.js";
import AppFooter      from "../components/layout/AppFooter.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";
import ConfirmModal   from "../components/ui/ConfirmModal.js";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function goToEvaluer(id) {
  window.location.href = `valider_demande.html?id_dmd=${id}`;
}
function goToDetail(id) {
  window.location.href = `detail_consulter_demande.html?id_dmd=${id}`;
}

// ---------------------------------------------------------------------------
// Définitions des colonnes
// ---------------------------------------------------------------------------

const COLS_INTRO = [
  { key: "type_demande",      label: "Type de demande" },
  { key: "banque",            label: "Banque" },
  { key: "categorie_demande", label: "Entité" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v) },
];

const COLS_CLOTURER = [
  { key: "type_demande",      label: "Type de demande" },
  { key: "banque",            label: "Filiale" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "categorie_demande", label: "Entité" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v) },
];

// ---------------------------------------------------------------------------
// Filtres — mêmes champs que consulter_demandes (Type / Banque / Entité /
// Contrepartie / Montant), adaptés aux colonnes présentes ici
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
  name: "GgrgValidationPage",

  components: {
    AppSidebar,
    AppNavbar,
    AppFooter,
    DemandesTable,
    DemandeFilters,
    ConfirmModal,
  },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // ---- Onglet actif ----
    const activeTab = ref("intro");   // "intro" | "cloturer"

    // ---- Données brutes ----
    const rowsIntro    = ref([]);
    const rowsCloturer = ref([]);

    const loadingIntro    = ref(true);
    const loadingCloturer = ref(true);

    const errorIntro    = ref(null);
    const errorCloturer = ref(null);

    // ---- Filtres partagés ----
    const filters = ref({ ...EMPTY_FILTERS });

    // ---- Filtre générique ----
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

    const filteredIntro    = computed(() => applyFilters(rowsIntro.value));
    const filteredCloturer = computed(() => applyFilters(rowsCloturer.value));

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

    async function loadCloturer() {
      loadingCloturer.value = true;
      errorCloturer.value = null;
      try {
        const data = await apiGet("/demandes_a_cloturer/");
        rowsCloturer.value = data.results ?? [];
      } catch (e) {
        errorCloturer.value = e.message;
      } finally {
        loadingCloturer.value = false;
      }
    }

    // ---- Modale clôture ----
    const showCloModal   = ref(false);
    const pendingCloId   = ref(null);

    function openCloModal(id) {
      pendingCloId.value = id;
      showCloModal.value = true;
    }

    // ---- Modale succès ----
    const showSuccessModal = ref(false);

    // ---- Clôture : POST /cloturer_demande/{id} (FormData) ----
    // Bug legacy corrigé : l'Authorization était hors de headers{} → silencieusement ignoré.
    // apiPostForm() gère correctement le header Authorization.
    async function handleCloturer({ comment }) {
      const fd = new FormData();
      fd.append("commentaire", comment);
      fd.append("id_decision", 1);

      try {
        await apiPostForm(`/cloturer_demande/${pendingCloId.value}`, fd);
        showSuccessModal.value = true;
      } catch (e) {
        console.error("[GgrgValidationPage] Erreur clôture :", e.message);
        alert(e.message);
      }
    }

    function handleCloSuccess() {
      showSuccessModal.value = false;
      window.location.reload();
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await Promise.allSettled([loadIntro(), loadCloturer()]);
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      activeTab,
      filteredIntro, filteredCloturer,
      loadingIntro,  loadingCloturer,
      errorIntro,    errorCloturer,
      filters,
      filterFields: FILTER_FIELDS,
      colsIntro:    COLS_INTRO,
      colsCloturer: COLS_CLOTURER,
      showCloModal,
      showSuccessModal,
      openCloModal,
      handleCloturer,
      handleCloSuccess,
      goToEvaluer,
      goToDetail,
    };
  },

  template: /* html */ `
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <!-- Sidebar — lien actif : valid_dmd_ggrg -->
      <AppSidebar active-page="valid_dmd_ggrg" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="MES DEMANDES" />

        <main class="flex-1 p-5" role="main">
          <div
            class="bg-white rounded-2xl shadow-sm border overflow-hidden"
            style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
          >

            <!-- En-tête : filtres + onglets -->
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
                      :aria-selected="activeTab === 'cloturer'"
                      @click="activeTab = 'cloturer'"
                      class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors focus:outline-none"
                      :style="activeTab === 'cloturer'
                        ? 'color: var(--color-brand); border-color: var(--color-brand);'
                        : 'color: var(--color-text-secondary); border-color: transparent;'"
                    >
                      Demandes fin de processus
                    </button>
                  </li>

                </ul>
              </div>
            </div>

            <!-- ============================================================
                 Onglet 1 — Demandes Introduites
                 Action : [Evaluer]
                 ============================================================ -->
            <div v-show="activeTab === 'intro'" role="tabpanel" aria-label="Demandes introduites">
              <DemandesTable
                :rows="filteredIntro"
                :columns="colsIntro"
                :loading="loadingIntro"
                :error="errorIntro"
                aria-label="Demandes introduites à évaluer"
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
                 Onglet 2 — Demandes fin de processus
                 Actions : [Détails] [Cloturer]
                 ============================================================ -->
            <div v-show="activeTab === 'cloturer'" role="tabpanel" aria-label="Demandes à clôturer">
              <DemandesTable
                :rows="filteredCloturer"
                :columns="colsCloturer"
                :loading="loadingCloturer"
                :error="errorCloturer"
                aria-label="Demandes fin de processus à clôturer"
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
                    @click="openCloModal(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Clôturer la demande ' + row.id_demande"
                  >
                    Cloturer
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
          aria-labelledby="popup-notif-ggrg"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-notif-ggrg"
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

      <!-- ================================================================
           Modale clôture (avec commentaire)
           ================================================================ -->
      <ConfirmModal
        v-model:show="showCloModal"
        title="Voulez-vous vraiment cloturer cette demande ?"
        confirm-label="Confirmer"
        cancel-label="Annuler"
        confirm-variant="primary"
        :with-comment="true"
        @confirm="handleCloturer"
      />

      <!-- ================================================================
           Modale succès post-clôture
           ================================================================ -->
      <ConfirmModal
        v-model:show="showSuccessModal"
        title="Cloturer demande"
        message="Demande cloturée !"
        confirm-label="OK"
        :with-comment="false"
        @confirm="handleCloSuccess"
        @cancel="handleCloSuccess"
      />

    </div>
  `,
});
