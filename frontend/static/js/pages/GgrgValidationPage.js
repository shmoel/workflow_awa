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
 * Dépendances :
 *   AppLayout, DemandesTable, ActionCell,
 *   ConfirmModal, useCurrentUser, useNotificationPolling
 */

import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPostForm }        from "../services/api.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import InfoModal from "../components/ui/InfoModal.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
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

// Wrappers de cellule identiques au legacy (generateTableDemandeRows,
// generateValidDemandesValiderRows)
const COLS_INTRO = [
  { key: "type_demande",      label: "Type de demande", wrap: "label" },
  { key: "banque",            label: "Banque",          wrap: "self" },
  { key: "categorie_demande", label: "Entité" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v) },
];

const COLS_CLOTURER = [
  { key: "type_demande",      label: "Type de demande", wrap: "label" },
  { key: "banque",            label: "Filiale",         wrap: "self" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "categorie_demande", label: "Entité" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v) },
];

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "GgrgValidationPage",

  components: { AppLayout, DemandesTable, ConfirmModal, ActionCell, InfoModal },

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



    // Pas de filtres sur cette page (absents du legacy)
    const filteredIntro = rowsIntro;
    const filteredCloturer = rowsCloturer;

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
    <AppLayout :polling="polling">
        <div class="container-fluid flex-grow-1 container-p-y">
            <h4 class="font-weight-bold py-3 mb-0">MES DEMANDES</h4>

            <div class="row">

                <div style="height: 310px" id="tasks-inner"></div>

                <div class="col-xl-12">
                    <div class="card mb-4">
                        <div class="card-header with-elements pb-0">
                            <h6 class="card-header-title mb-0"></h6>
                            <div class="card-header-elements ml-auto p-0">
                                <ul class="nav nav-tabs">
                                    <li class="nav-item">
                                        <a class="nav-link" :class="{ active: activeTab === 'intro' }" href="javascript:" @click="activeTab = 'intro'">Demandes Introduites</a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" :class="{ active: activeTab === 'cloturer' }" href="javascript:" @click="activeTab = 'cloturer'">Demandes fin de processus</a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="nav-tabs-top">
                            <div class="tab-content">

                                <div class="tab-pane fade" :class="{ 'show active': activeTab === 'intro' }" id="demande-intro">
                                    <div style="height: 330px" id="tab-table-1">
                                        <DemandesTable :rows="filteredIntro" :columns="colsIntro" :action-headers="1" :error="errorIntro">
                                            <template #actions="{ row }">
                                                <ActionCell btn-class="btn btn-glow-info btn-info" label="Evaluer" @click="goToEvaluer(row.id_demande)" />
                                            </template>
                                        </DemandesTable>
                                    </div>
                                    <a href="javascript:" class="card-footer d-block text-center text-dark small font-weight-semibold"></a>
                                </div>
                                <div class="tab-pane fade" :class="{ 'show active': activeTab === 'cloturer' }" id="demande-val">
                                    <div style="height: 330px" id="tab-table-2">
                                        <DemandesTable :rows="filteredCloturer" :columns="colsCloturer" :error="errorCloturer">
                                            <template #actions="{ row }">
                                                <ActionCell btn-class="btn btn-dark" label="Détails" @click="goToDetail(row.id_demande)" />
                                                <ActionCell btn-class="btn btn-outline-primary" label="Cloturer" @click="openCloModal(row.id_demande)" />
                                            </template>
                                        </DemandesTable>
                                    </div>
                                    <a href="javascript:" class="card-footer d-block text-center text-dark small font-weight-semibold"></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <template #modals>
            <ConfirmModal
                v-model:show="showCloModal"
                title="Voulez-vous vraiment cloturer cette demande  ?"
                :with-comment="true"
                comment-placeholder="Laisser un message"
                @confirm="handleCloturer"
            />
            <InfoModal
                :show="showSuccessModal"
                title="Cloturer demande"
                message="Demande  cloturée !"
                @ok="handleCloSuccess"
            />
        </template>
    </AppLayout>
  `,
});
