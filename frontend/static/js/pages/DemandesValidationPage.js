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
 * Dépendances :
 *   AppLayout, DemandesTable, ActionCell,
 *   useCurrentUser, useNotificationPolling
 *   (pas de ConfirmModal : aucune action destructive sur cette page)
 */

import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
} from "vue";

import { apiGet }                     from "../services/api.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";
import { EVENT, etatFinProcess }        from "../domain/workflow.js";

import AppLayout from "../components/layout/AppLayout.js";
import ActionCell from "../components/demandes/ActionCell.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import TabsCard  from "../components/demandes/TabsCard.js";
import { BTN }   from "../components/ui/classes.js";

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

// Wrappers de cellule identiques au legacy (generateTableDemandeRows,
// generateValidDemandesValiderRows, generateDemandes_finProcess)
const MONTANT = { key: "montant", label: "Montant (Xof)", format: (v) => formatNumber(v) };

// Onglets 1 et 2 partagent les mêmes colonnes de données
const COLS_INTRO_VALID = [
  { key: "type_demande",      label: "Type de demande", wrap: "label" },
  { key: "banque",            label: "Banque",          wrap: "self" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "categorie_demande", label: "Entité" },
  MONTANT,
];

// Onglet 3 : colonnes différentes (Entité en premier, Date, Etat)
const COLS_FIN = [
  { key: "categorie_demande", label: "Entité",          wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande", wrap: "media" },
  { key: "nom_client",        label: "Contrepartie" },
  MONTANT,
  { key: "date_val",          label: "Date / Heure" },
  { key: "_etat",             label: "Etat",
    button: (row) => row.max_event === EVENT.ARRETEE_DG
      ? { cls: BTN.danger,  label: "Arrêté", disabled: true }
      : { cls: BTN.default, label: "Terme",  disabled: true } },
];

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

/** Onglets de la carte (identifiants de volet legacy) */
const TABS = [
  { key: "intro", label: "Demandes Introduites",            paneId: "demande-intro" },
  { key: "valid", label: "Demandes en validation",          paneId: "demande-val" },
  { key: "fin",   label: "Demandes en fin de de processus", paneId: "demande-fin-process" },
];

export default defineComponent({
  name: "DemandesValidationPage",

  components: { AppLayout, DemandesTable, TabsCard, ActionCell },

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



    // Pas de filtres sur cette page (absents du legacy)
    const filteredIntro = rowsIntro;
    const filteredValid = rowsValid;
    const filteredFin = rowsFin;

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
          _etat: etatFinProcess(r),
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
      colsIntroValid:  COLS_INTRO_VALID,
      colsFin:         COLS_FIN,
      goToEvaluer,
      goToDetail,
      goToChat,
      tabs: TABS,
      BTN,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling" menu-label="Actions">
        <div class="flex-grow px-4 lg:px-8 py-6">
            <h4 class="py-4 mb-0 text-h4 font-bold">MES DEMANDES</h4>

            <div class="flex flex-wrap -mx-3">

                <div class="h-[310px]" id="tasks-inner"></div>

                <TabsCard :tabs="tabs" v-model="activeTab">
                    <template #intro>
                        <DemandesTable theme="demandes" :rows="filteredIntro" :columns="colsIntroValid" :action-headers="1" :error="errorIntro">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.info" label="Evaluer" @click="goToEvaluer(row.id_demande)" />
                            </template>
                        </DemandesTable>
                    </template>
                    <template #valid>
                        <DemandesTable theme="demandes" :rows="filteredValid" :columns="colsIntroValid" :action-headers="1" :error="errorValid">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.dark" label="Détails" @click="goToDetail(row.id_demande)" />
                                <ActionCell :btn-class="BTN.glowInfo" label="CHAT" @click="goToChat(row.id_demande)" />
                            </template>
                        </DemandesTable>
                    </template>
                    <template #fin>
                        <DemandesTable theme="demandes" :rows="filteredFin" :columns="colsFin" :error="errorFin">
                            <template #actions="{ row }">
                                <ActionCell :btn-class="BTN.dark" label="Détails" @click="goToDetail(row.id_demande)" />
                            </template>
                        </DemandesTable>
                    </template>
                </TabsCard>
            </div>

        </div>
    </AppLayout>
  `,
});
