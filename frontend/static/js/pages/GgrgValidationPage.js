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
 *              [Clôturer] → ouvre ConfirmModal avec commentaire
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
  computed,
  onMounted,
  onUnmounted,
} from "vue";

import { apiPostForm }                from "../services/api.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";
import { useDemandesList }           from "../composables/useDemandesList.js";
import { useRowFilters }             from "../composables/useRowFilters.js";
import { goToDetail, goToEvaluer }    from "../utils/navigation.js";

import AppLayout from "../components/layout/AppLayout.js";
import InfoModal from "../components/ui/InfoModal.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable, { formatNumber, SORT_MONTANT } from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";
import ConfirmModal   from "../components/ui/ConfirmModal.js";
import TabsCard       from "../components/demandes/TabsCard.js";
import { BTN, ALERT_DANGER_FORM } from "../components/ui/classes.js";
import { SkeletonTable } from "../components/ui/SkeletonLoader.js";

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
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v), sort: SORT_MONTANT },
];

const COLS_CLOTURER = [
  { key: "type_demande",      label: "Type de demande", wrap: "label" },
  { key: "banque",            label: "Filiale",         wrap: "self" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "categorie_demande", label: "Entité" },
  { key: "montant",           label: "Montant (Xof)", format: (v) => formatNumber(v), sort: SORT_MONTANT },
];

// Filtres au-dessus des onglets (lot G, feuille de route UI/UX, point 12 ;
// retirés le 08/10/2026 par fidélité au legacy) : ils s'appliquent à tous les onglets
const FILTER_FIELDS = [
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
];
const FILTERED_FIELD = {
  banque:       "banque",
  entite:       "categorie_demande",
  type:         "type_demande",
  contrepartie: "nom_client",
};

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

  components: { AppLayout, DemandesTable, TabsCard, ConfirmModal, ActionCell, InfoModal, DemandeFilters, SkeletonTable },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // ---- Onglet actif ----
    const activeTab = ref("intro");   // "intro" | "cloturer"

    // ---- Listes des onglets ----
    const intro    = useDemandesList("/demandes_a_valider/");
    const cloturer = useDemandesList("/demandes_a_cloturer/");

    // ---- Filtres communs aux 2 onglets ----
    const { filters, filterRows } = useRowFilters(FILTERED_FIELD);
    const introRows    = computed(() => filterRows(intro.rows));
    const cloturerRows = computed(() => filterRows(cloturer.rows));
    const emptyText = computed(() => Object.values(filters.value).some(Boolean)
      ? "Aucune demande ne correspond aux filtres" : "Aucune demande");

    // ---- Modale clôture ----
    const showCloModal   = ref(false);
    const pendingCloId   = ref(null);

    function openCloModal(id) {
      pendingCloId.value = id;
      showCloModal.value = true;
    }

    // ---- Modale succès ----
    const showSuccessModal = ref(false);

    /** Erreur de la dernière clôture, affichée en haut de la page */
    const actionError = ref("");

    // ---- Clôture : POST /cloturer_demande/{id} (FormData) ----
    // Bug legacy corrigé : l'Authorization était hors de headers{} → silencieusement ignoré.
    // apiPostForm() gère correctement le header Authorization.
    async function handleCloturer({ comment }) {
      actionError.value = "";
      const fd = new FormData();
      fd.append("commentaire", comment);
      fd.append("id_decision", 1);

      try {
        await apiPostForm(`/cloturer_demande/${pendingCloId.value}`, fd);
        showSuccessModal.value = true;
      } catch (e) {
        actionError.value = e.message;
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
      await Promise.allSettled([intro.load(), cloturer.load()]);
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      activeTab,
      intro, cloturer,
      introRows, cloturerRows,
      filters,
      filterFields: FILTER_FIELDS,
      emptyText,
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
      ALERT_DANGER_FORM,
      actionError,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex-grow px-4 lg:px-8 py-6">
            <h4 class="py-4 mb-0 text-h4 font-bold">DEMANDES À VALIDER</h4>

            <div v-if="actionError" :class="ALERT_DANGER_FORM" role="alert">
                <i class="bi bi-exclamation-triangle"></i> Erreur lors de la clôture : {{ actionError }}
            </div>

            <div class="flex flex-wrap -mx-3">

                <div class="h-[310px]" id="tasks-inner"></div>

                <TabsCard :tabs="tabs" v-model="activeTab">
                    <template #filters>
                        <DemandeFilters :fields="filterFields" v-model="filters" />
                    </template>
                    <template #intro>
                        <!-- Skeleton pendant le chargement -->
                        <SkeletonTable v-if="intro.loading" :rows="5" :columns="7" />
                        
                        <!-- Tableau réel -->
                        <DemandesTable v-else theme="demandes" :rows="introRows" :columns="colsIntro" :action-headers="1" :error="intro.error" :loading="intro.loading" :empty-text="emptyText">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.glowInfo" label="Evaluer" @click="goToEvaluer(row.id_demande)" />
                            </template>
                        </DemandesTable>
                    </template>
                    <template #cloturer>
                        <!-- Skeleton pendant le chargement -->
                        <SkeletonTable v-if="cloturer.loading" :rows="5" :columns="7" />
                        
                        <!-- Tableau réel -->
                        <DemandesTable v-else theme="demandes" :rows="cloturerRows" :columns="colsCloturer" :error="cloturer.error" :loading="cloturer.loading" :empty-text="emptyText">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.dark" label="Détails" @click="goToDetail(row.id_demande)" />
                                <ActionCell :btn-class="BTN.outlinePrimary" label="Clôturer" @click="openCloModal(row.id_demande)" />
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
                title="Voulez-vous vraiment clôturer cette demande  ?"
                :with-comment="true"
                comment-placeholder="Laisser un message"
                @confirm="handleCloturer"
            />
            <InfoModal
                :show="showSuccessModal"
                variant="design"
                title="Clôturer la demande"
                message="Demande  clôturée !"
                @ok="handleCloSuccess"
            />
        </template>
    </AppLayout>
  `,
});
