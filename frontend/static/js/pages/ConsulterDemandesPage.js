/**
 * pages/ConsulterDemandesPage.js
 *
 * Composant "page" pour consulter_demandes.html.
 *
 * Reproduit à l'identique le comportement legacy :
 *
 * ── Onglet 1 : "Demandes Introduites" ──────────────────────────────────────
 *   Endpoint : GET /demandes_user/
 *   Colonnes : Entité | Type de demande | Contrepartie | Montant (Xof) |
 *              Date / Heure | [Modifier] [Supprimer]
 *   Actions  : Modifier → modifier_demande.html?id_dmd=X
 *              Supprimer → ouvre ConfirmModal avec textarea commentaire
 *              → POST /avis/ avec id_event=8 (suppression)
 *
 * ── Onglet 2 : "Demandes en validation" ────────────────────────────────────
 *   Endpoint : GET /demandes_user_valider/
 *   Colonnes : Entité | Type de demande | Contrepartie | Montant (Xof) |
 *              Date / Heure | Etape de validation | [Détails] [CHAT]
 *
 * ── Onglet 3 : "Demandes en fin de processus" ──────────────────────────────
 *   Endpoint : GET /demandes_fin_process/
 *   Colonnes : Entité | Type de demande | Contrepartie | Montant (Xof) |
 *              Date / Heure | Etat | [Détails] [CHAT]
 *   Etat     : si max_event === 9 → badge "Arrêté" (rouge)
 *              sinon              → badge "Terme"  (gris)
 *
 * ── Modale succès ───────────────────────────────────────────────────────────
 *   Après suppression réussie : ConfirmModal simple "Demande supprimée !"
 *   puis window.location.reload() (comportement legacy cancelSuccess())
 *
 * Duplication éliminée :
 *   - generateTableDemandeRows / generateValidDemandesValiderRows /
 *     generateDemandes_finProcess (~150 lignes de DOM manipulation)
 *   - escapeHtml + formatNumber importés depuis DemandesTable.js
 *   - showConfirmation / cancelSubmission / supprimer_demande / cancelSuccess
 *
 * Dépendances :
 *   AppLayout (layout legacy : sidebar, navbar, pied de page, popup)
 *   AppLayout, DemandesTable, ActionCell, ConfirmModal, InfoModal (composants)
 *   useCurrentUser, useNotificationPolling (composables)
 *   apiGet, apiPost (services)
 */

import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPost } from "../services/api.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import InfoModal from "../components/ui/InfoModal.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import ConfirmModal  from "../components/ui/ConfirmModal.js";

// ---------------------------------------------------------------------------
// Helpers de navigation (réutilisés dans les slots actions)
// ---------------------------------------------------------------------------
function goToDetail(id) {
  window.location.href = `detail_consulter_demande.html?id_dmd=${id}`;
}
function goToModify(id) {
  window.location.href = `modifier_demande.html?id_dmd=${id}`;
}
function goToChat(id) {
  window.location.href = `chat.html?id_dmd=${id}`;
}

// ---------------------------------------------------------------------------
// Définitions des colonnes par onglet
// ---------------------------------------------------------------------------

/**
 * Colonnes des 3 onglets — wrappers de cellule identiques au legacy
 * (generateTableDemandeRows, generateValidDemandesValiderRows, generateDemandes_finProcess).
 * Le legacy n'avait pas d'en-tête pour les colonnes de boutons des onglets 2 et 3.
 */
const MONTANT = { key: "montant", label: "Montant (Xof)", format: (v) => formatNumber(v) };

const COLS_INTRO = [
  { key: "categorie_demande", label: "Entité",          wrap: "label" },
  { key: "type_demande",      label: "Type de demande", wrap: "self" },
  { key: "nom_client",        label: "Contrepartie" },
  MONTANT,
  { key: "_date_heure",       label: "Date / Heure" },
];
const COLS_VALID = [
  { key: "categorie_demande", label: "Entité",          wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande", wrap: "media" },
  { key: "nom_client",        label: "Contrepartie" },
  MONTANT,
  { key: "_date_heure",       label: "Date / Heure" },
  { key: "description",       label: "Etape de validation" },
];
const COLS_FIN = [
  { key: "categorie_demande", label: "Entité",          wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande", wrap: "media" },
  { key: "nom_client",        label: "Contrepartie" },
  MONTANT,
  { key: "_date_heure",       label: "Date / Heure" },
  { key: "_etat",             label: "Etat",
    button: (row) => row.max_event === 9
      ? { cls: "btn btn-danger",  label: "Arrêté" }
      : { cls: "btn btn-default", label: "Terme" } },
];


function normalizeIntro(rows) {
  return (rows ?? []).map((r) => ({
    ...r,
    _date_heure: [r.date, r.heure].filter(Boolean).join(" "),
  }));
}

function normalizeValider(rows) {
  return (rows ?? []).map((r) => ({
    ...r,
    _date_heure: r.date_val ?? "",
  }));
}

function normalizeFinProcess(rows) {
  return (rows ?? []).map((r) => ({
    ...r,
    _date_heure: r.date_val ?? "",
    _etat: r.max_event === 9 ? "Arrêté" : "Terme",
  }));
}

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "ConsulterDemandesPage",

  components: { AppLayout, DemandesTable, ConfirmModal, ActionCell, InfoModal },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // ---- Onglet actif ----
    // "intro" | "valid" | "fin"
    const activeTab = ref("intro");

    // ---- Données brutes par onglet ----
    const rowsIntro = ref([]);
    const rowsValid = ref([]);
    const rowsFin   = ref([]);

    const loadingIntro = ref(true);
    const loadingValid = ref(true);
    const loadingFin   = ref(true);

    const errorIntro = ref(null);
    const errorValid = ref(null);
    const errorFin   = ref(null);

    // Pas de filtres sur cette page (absents du legacy)
    const filteredIntro = rowsIntro;
    const filteredValid = rowsValid;
    const filteredFin   = rowsFin;

    // ---- Chargement des données ----
    async function loadIntro() {
      loadingIntro.value = true;
      errorIntro.value = null;
      try {
        const data = await apiGet("/demandes_user/");
        rowsIntro.value = normalizeIntro(data.results);
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
        const data = await apiGet("/demandes_user_valider/");
        rowsValid.value = normalizeValider(data.results);
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
        rowsFin.value = normalizeFinProcess(data.results);
      } catch (e) {
        errorFin.value = e.message;
      } finally {
        loadingFin.value = false;
      }
    }

    // ---- Modale suppression ----
    const showDeleteModal  = ref(false);
    const pendingDeleteId  = ref(null);   // id_demande en attente de confirmation

    function openDeleteModal(idDemande) {
      pendingDeleteId.value = idDemande;
      showDeleteModal.value = true;
    }

    // ---- Modale succès (après suppression) ----
    const showSuccessModal = ref(false);

    // ---- Suppression : POST /avis/ avec id_event=8 ----
    async function handleDelete({ comment }) {
      // Récupère le profil pour construire le payload (banque → id_niveauValidation)
      const profil = user.raw.value;
      if (!profil) return;

      const banque = profil.banque;
      let id_niveauValidation;
      if (banque === "AWA")      id_niveauValidation = 2;
      else if (banque === "AIG") id_niveauValidation = 3;
      else                       id_niveauValidation = 1;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const date  = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const heure = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      try {
        await apiPost("/avis/", {
          commentaire:        comment,
          date,
          heure,
          id_demande:         pendingDeleteId.value,
          id_event:           8,            // code "suppression" côté API
          id_valideur:        profil.user_id,
          id_decision:        1,
          id_niveauValidation,
        });
        showSuccessModal.value = true;
      } catch (e) {
        // Affiche l'erreur dans la modale de suppression plutôt qu'une alert()
        console.error("[ConsulterDemandesPage] Erreur suppression :", e.message);
        alert(e.message);
      }
    }

    function handleDeleteSuccess() {
      showSuccessModal.value = false;
      // Recharge la page (comportement legacy cancelSuccess)
      window.location.reload();
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      // Charge les 3 onglets en parallèle
      await Promise.allSettled([loadIntro(), loadValid(), loadFin()]);
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      activeTab,
      // Données filtrées
      filteredIntro,
      filteredValid,
      filteredFin,
      // États de chargement
      loadingIntro, loadingValid, loadingFin,
      errorIntro,   errorValid,   errorFin,
      // Colonnes
      colsIntro: COLS_INTRO,
      colsValid: COLS_VALID,
      colsFin:   COLS_FIN,
      // Modales
      showDeleteModal,
      showSuccessModal,
      openDeleteModal,
      handleDelete,
      handleDeleteSuccess,
      // Navigation
      goToDetail,
      goToModify,
      goToChat,
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
                                        <a class="nav-link" :class="{ active: activeTab === 'valid' }" href="javascript:" @click="activeTab = 'valid'">Demandes en validation</a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" :class="{ active: activeTab === 'fin' }" href="javascript:" @click="activeTab = 'fin'">Demandes en fin de de processus</a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="nav-tabs-top">
                            <div class="tab-content">

                                <div class="tab-pane fade" :class="{ 'show active': activeTab === 'intro' }" id="demande-intro">
                                    <div style="height: 330px" id="tab-table-1">
                                        <DemandesTable :rows="filteredIntro" :columns="colsIntro" :action-headers="2" :error="errorIntro">
                                            <template #actions="{ row }">
                                                <ActionCell btn-class="btn btn-glow-warning btn-warning" label="Modifier" @click="goToModify(row.id_demande)" />
                                                <ActionCell btn-class="btn btn-glow-danger btn-danger" label="Supprimer" @click="openDeleteModal(row.id_demande)" />
                                            </template>
                                        </DemandesTable>
                                    </div>
                                    <a href="javascript:" class="card-footer d-block text-center text-dark small font-weight-semibold"></a>
                                </div>
                                <div class="tab-pane fade" :class="{ 'show active': activeTab === 'valid' }" id="demande-val">
                                    <div style="height: 330px" id="tab-table-2">
                                        <DemandesTable :rows="filteredValid" :columns="colsValid" :error="errorValid">
                                            <template #actions="{ row }">
                                                <ActionCell btn-class="btn btn-glow-secondary btn-secondary" label="Détails" @click="goToDetail(row.id_demande)" />
                                                <ActionCell btn-class="btn btn-glow-info btn-info" label="CHAT" @click="goToChat(row.id_demande)" />
                                            </template>
                                        </DemandesTable>
                                    </div>
                                    <a href="javascript:" class="card-footer d-block text-center text-dark small font-weight-semibold"></a>
                                </div>
                                <div class="tab-pane fade" :class="{ 'show active': activeTab === 'fin' }" id="demande-fin-process">
                                    <div style="height: 330px" id="tab-table-3">
                                        <DemandesTable :rows="filteredFin" :columns="colsFin" :error="errorFin">
                                            <template #actions="{ row }">
                                                <ActionCell btn-class="btn btn-glow-secondary btn-secondary" label="Détails" @click="goToDetail(row.id_demande)" />
                                                <ActionCell btn-class="btn btn-glow-info btn-info" label="CHAT" @click="goToChat(row.id_demande)" />
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
                v-model:show="showDeleteModal"
                title="Pourquoi voulez-vous supprimer votre demande ?"
                :with-comment="true"
                @confirm="handleDelete"
            />
            <InfoModal
                :show="showSuccessModal"
                title="Validation"
                message="Demande  supprimée !"
                @ok="handleDeleteSuccess"
            />
        </template>
    </AppLayout>
  `,
});
