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
} from "vue";

import { apiGet, apiPostForm }        from "../services/api.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import InfoModal from "../components/ui/InfoModal.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import ConfirmModal   from "../components/ui/ConfirmModal.js";
import TabsCard       from "../components/demandes/TabsCard.js";
import { BTN }        from "../components/ui/classes.js";

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

/** Onglets de la carte (identifiants de volet legacy) */
const TABS = [
  { key: "intro",    label: "Demandes Introduites",      paneId: "demande-intro" },
  { key: "cloturer", label: "Demandes fin de processus", paneId: "demande-val" },
];

export default defineComponent({
  name: "GgrgValidationPage",

  components: { AppLayout, DemandesTable, TabsCard, ConfirmModal, ActionCell, InfoModal },

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
      tabs: TABS,
      BTN,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex-grow px-4 lg:px-8 py-6">
            <h4 class="py-4 mb-0 text-h4 font-bold">MES DEMANDES</h4>

            <div class="flex flex-wrap -mx-3">

                <div class="h-[310px]" id="tasks-inner"></div>

                <TabsCard :tabs="tabs" v-model="activeTab">
                    <template #intro>
                        <DemandesTable theme="demandes" :rows="filteredIntro" :columns="colsIntro" :action-headers="1" :error="errorIntro">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.glowInfo" label="Evaluer" @click="goToEvaluer(row.id_demande)" />
                            </template>
                        </DemandesTable>
                    </template>
                    <template #cloturer>
                        <DemandesTable theme="demandes" :rows="filteredCloturer" :columns="colsCloturer" :error="errorCloturer">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.dark" label="Détails" @click="goToDetail(row.id_demande)" />
                                <ActionCell :btn-class="BTN.outlinePrimary" label="Cloturer" @click="openCloModal(row.id_demande)" />
                            </template>
                        </DemandesTable>
                    </template>
                </TabsCard>
            </div>

        </div>

        <template #modals>
            <ConfirmModal
                v-model:show="showCloModal"
                variant="design"
                title="Voulez-vous vraiment cloturer cette demande  ?"
                :with-comment="true"
                comment-placeholder="Laisser un message"
                @confirm="handleCloturer"
            />
            <InfoModal
                :show="showSuccessModal"
                variant="design"
                title="Cloturer demande"
                message="Demande  cloturée !"
                @ok="handleCloSuccess"
            />
        </template>
    </AppLayout>
  `,
});
