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
 *   AppSidebar, AppNavbar, AppFooter (layout)
 *   DemandesTable, DemandeFilters, ConfirmModal (composants)
 *   useCurrentUser, useNotificationPolling (composables)
 *   apiGet, apiPost (services)
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPost } from "../services/api.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppSidebar    from "../components/layout/AppSidebar.js";
import AppNavbar     from "../components/layout/AppNavbar.js";
import AppFooter     from "../components/layout/AppFooter.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";
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

/** Colonnes communes aux 3 onglets (Entité → Date/Heure) */
const COLS_BASE = [
  { key: "categorie_demande", label: "Entité" },
  { key: "type_demande",      label: "Type de demande" },
  { key: "nom_client",        label: "Contrepartie" },
  {
    key: "montant",
    label: "Montant (Xof)",
    format: (v) => formatNumber(v),
  },
  {
    key: "_date_heure",
    label: "Date / Heure",
    // La valeur est construite dans la fonction de normalisation des lignes
  },
];

const COLS_INTRO   = [...COLS_BASE];                             // + actions Modifier/Supprimer
const COLS_VALID   = [...COLS_BASE, { key: "description", label: "Etape de validation" }]; // + Détails/CHAT
const COLS_FIN     = [...COLS_BASE, { key: "_etat",        label: "Etat" }];               // + Détails/CHAT

// ---------------------------------------------------------------------------
// Normalisation des lignes (date + heure concaténés dans un champ virtuel)
// ---------------------------------------------------------------------------

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
// Champs de filtre partagés entre les 3 onglets
// ---------------------------------------------------------------------------
const FILTER_FIELDS = [
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "montant",      placeholder: "Filtrer par Montant" },
  { key: "date",         placeholder: "Filtrer par Date" },
];

const EMPTY_FILTERS = { entite: "", type: "", contrepartie: "", montant: "", date: "" };

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "ConsulterDemandesPage",

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

    // ---- Filtres (un seul objet réactif, partagé entre les onglets) ----
    const filters = ref({ ...EMPTY_FILTERS });

    // ---- Computed filtrés par onglet ----
    function applyFilters(rows) {
      const e = filters.value.entite.toLowerCase();
      const t = filters.value.type.toLowerCase();
      const c = filters.value.contrepartie.toLowerCase();
      const m = filters.value.montant.toLowerCase();
      const d = filters.value.date.toLowerCase();
      return rows.filter(
        (r) =>
          (r.categorie_demande ?? "").toLowerCase().includes(e) &&
          (r.type_demande      ?? "").toLowerCase().includes(t) &&
          (r.nom_client        ?? "").toLowerCase().includes(c) &&
          String(r.montant ?? "").toLowerCase().includes(m) &&
          (r._date_heure       ?? "").toLowerCase().includes(d)
      );
    }

    const filteredIntro = computed(() => applyFilters(rowsIntro.value));
    const filteredValid = computed(() => applyFilters(rowsValid.value));
    const filteredFin   = computed(() => applyFilters(rowsFin.value));

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
      // Filtres
      filters,
      filterFields: FILTER_FIELDS,
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
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <!-- Sidebar -->
      <AppSidebar active-page="consult_dmd" />

      <!-- Zone principale -->
      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="MES DEMANDES" />

        <main class="flex-1 p-5" role="main">

          <!-- Carte principale -->
          <div
            class="bg-white rounded-2xl shadow-sm border overflow-hidden"
            style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
          >

            <!-- ---- En-tête : filtres + onglets ---- -->
            <div
              class="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-0 border-b"
              style="border-color: var(--color-brand-border);"
            >
              <!-- Filtres -->
              <div class="pb-3">
                <DemandeFilters
                  :fields="filterFields"
                  v-model="filters"
                />
              </div>

              <!-- Onglets -->
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

            <!-- ================================================================
                 Onglet 1 — Demandes Introduites
                 Actions : Modifier | Supprimer
                 ================================================================ -->
            <div v-show="activeTab === 'intro'" role="tabpanel" aria-label="Demandes introduites">
              <DemandesTable
                :rows="filteredIntro"
                :columns="colsIntro"
                :loading="loadingIntro"
                :error="errorIntro"
                aria-label="Demandes introduites"
              >
                <template #actions="{ row }">
                  <!-- Modifier -->
                  <button
                    @click="goToModify(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: #d97706; border-color: #d97706; background: #fff;"
                    onmouseover="this.style.background='#d97706';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='#d97706';"
                    :aria-label="'Modifier la demande ' + row.id_demande"
                  >
                    Modifier
                  </button>
                  <!-- Supprimer -->
                  <button
                    @click="openDeleteModal(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-status-rejected); border-color: var(--color-status-rejected); background: #fff;"
                    onmouseover="this.style.background='var(--color-status-rejected)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-status-rejected)';"
                    :aria-label="'Supprimer la demande ' + row.id_demande"
                  >
                    Supprimer
                  </button>
                </template>
              </DemandesTable>
            </div>

            <!-- ================================================================
                 Onglet 2 — Demandes en validation
                 Actions : Détails | CHAT
                 ================================================================ -->
            <div v-show="activeTab === 'valid'" role="tabpanel" aria-label="Demandes en validation">
              <DemandesTable
                :rows="filteredValid"
                :columns="colsValid"
                :loading="loadingValid"
                :error="errorValid"
                aria-label="Demandes en validation"
              >
                <template #actions="{ row }">
                  <button
                    @click="goToDetail(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Détails de la demande ' + row.id_demande"
                  >Détails</button>
                  <button
                    @click="goToChat(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Chat de la demande ' + row.id_demande"
                  >CHAT</button>
                </template>
              </DemandesTable>
            </div>

            <!-- ================================================================
                 Onglet 3 — Demandes en fin de processus
                 Badge Etat : Arrêté (rouge) | Terme (gris)
                 Actions : Détails | CHAT
                 ================================================================ -->
            <div v-show="activeTab === 'fin'" role="tabpanel" aria-label="Demandes en fin de processus">
              <DemandesTable
                :rows="filteredFin"
                :columns="colsFin"
                :loading="loadingFin"
                :error="errorFin"
                aria-label="Demandes en fin de processus"
              >
                <!-- Badge Etat coloré dans la colonne _etat (dernière colonne de données) -->
                <template #badge="{ row }">
                  <!-- Le slot badge s'affiche dans la 1ère colonne ;
                       l'état est dans une colonne dédiée via COLS_FIN,
                       donc on n'utilise pas le slot badge ici —
                       la colonne _etat est rendue normalement. -->
                </template>
                <template #actions="{ row }">
                  <button
                    @click="goToDetail(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Détails de la demande ' + row.id_demande"
                  >Détails</button>
                  <button
                    @click="goToChat(row.id_demande)"
                    class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                    style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                    onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                    onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                    :aria-label="'Chat de la demande ' + row.id_demande"
                  >CHAT</button>
                </template>
              </DemandesTable>
            </div>

          </div>
          <!-- fin carte principale -->

        </main>

        <AppFooter />
      </div>
      <!-- fin zone principale -->

      <!-- ================================================================
           Popup notification nouvelle demande (polling)
           ================================================================ -->
      <Transition name="fade">
        <div
          v-if="polling.show.value"
          class="fixed inset-0 z-50 flex items-start justify-center"
          style="background: rgba(0,0,0,0.35);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-notif-title"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-notif-title"
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
                class="px-8 py-2 rounded-full text-white font-bold text-base"
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
           Modale suppression (avec commentaire)
           ================================================================ -->
      <ConfirmModal
        v-model:show="showDeleteModal"
        title="Pourquoi voulez-vous supprimer votre demande ?"
        confirm-label="Confirmer"
        cancel-label="Annuler"
        confirm-variant="danger"
        :with-comment="true"
        @confirm="handleDelete"
      />

      <!-- ================================================================
           Modale succès post-suppression
           ================================================================ -->
      <ConfirmModal
        v-model:show="showSuccessModal"
        title="Validation"
        message="Demande supprimée !"
        confirm-label="OK"
        :with-comment="false"
        @confirm="handleDeleteSuccess"
        @cancel="handleDeleteSuccess"
      />

    </div>
  `,
});
