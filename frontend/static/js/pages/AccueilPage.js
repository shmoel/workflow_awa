/**
 * pages/AccueilPage.js
 *
 * Composant "page" pour acceuil.html — tableau de bord principal.
 *
 * Reproduit à l'identique le comportement legacy :
 *   - 6 cartes de compteurs (GET /nombre_demandes/{niveau})
 *   - Tableau des demandes introduites (GET /demandes_a_consulter/{domaine})
 *   - Badge "Nouveau message" par ligne (GET /messages_chat/{id} × n demandes)
 *     détection : localStorage lastMsg_{id} ≠ dernière date API
 *   - Filtres en temps réel : Banque / Entité / Type / Contrepartie / Date
 *   - Bouton CHAT : marque vu dans localStorage puis redirige vers chat.html
 *   - Bouton Détails : redirige vers detail_consulter_demande.html
 *   - Popup polling "Nouvelle demande à valider" (useNotificationPolling)
 *
 * Colonnes du tableau (ordre legacy) :
 *   Banque | Entité | Type de demande | Contrepartie | Date/Heure |
 *   Niveau validation | [Détails] [CHAT]
 *
 * Utilise DemandesTable v2 (props rows/columns/slots).
 * Les filtres sont délégués à DemandeFilters.
 * Les StatCards sont autonomes (chargement interne).
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet }                     from "../services/api.js";
import { lastMsgKey, messageStamp, markMessagesSeen } from "../services/chatSeen.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import ActionCell from "../components/demandes/ActionCell.js";
import StatCard       from "../components/demandes/StatCard.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";

// ---------------------------------------------------------------------------
// Colonnes du tableau (ordre identique au legacy)
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: "banque",            label: "Banque",            wrap: "cc-label" },
  { key: "categorie_demande", label: "Entité",            wrap: "cc-label" },
  { key: "type_demande",      label: "Type de demande",   wrap: "cc" },
  { key: "nom_client",        label: "Contrepartie",      wrap: "cc" },
  { key: "_date_heure",       label: "Date / Heure",      wrap: "cc" },
  { key: "description",       label: "Niveau validation", wrap: "cc" },
];

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const FILTER_FIELDS = [
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "date",         placeholder: "Filtrer par date " },
];

const EMPTY_FILTERS = { banque: "", entite: "", type: "", contrepartie: "", date: "" };

// ---------------------------------------------------------------------------
// Cartes de compteurs (ordre identique au legacy)
// ---------------------------------------------------------------------------
const STAT_CARDS = [
  { title: "Validation GGR Local",  niveau: 1 },
  { title: "Cloturées",             niveau: 6 },
  { title: "Validation FO Group",   niveau: 4 },
  { title: "Validation DG Local",   niveau: 2 },
  { title: "Validation AWA",        niveau: 3 },
  { title: "Validation GGR Group",  niveau: 5 },
];

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "AccueilPage",

  components: { AppLayout, StatCard, DemandesTable, DemandeFilters, ActionCell },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // ---- Données brutes ----
    const allDemandes    = ref([]);
    const newMessageMap  = ref({});   // id_demande → boolean
    const loadingTable   = ref(true);
    const errorTable     = ref(null);

    // ---- Filtres ----
    const filters = ref({ ...EMPTY_FILTERS });

    // ---- Liste filtrée ----
    const filteredRows = computed(() => {
      const b = filters.value.banque.toLowerCase();
      const e = filters.value.entite.toLowerCase();
      const t = filters.value.type.toLowerCase();
      const c = filters.value.contrepartie.toLowerCase();
      const d = filters.value.date.toLowerCase();
      return allDemandes.value.filter(
        (r) =>
          (r.banque            ?? "").toLowerCase().includes(b) &&
          (r.categorie_demande ?? "").toLowerCase().includes(e) &&
          (r.type_demande      ?? "").toLowerCase().includes(t) &&
          (r.nom_client        ?? "").toLowerCase().includes(c) &&
          (r._date_heure       ?? "").toLowerCase().includes(d)
      );
    });

    // ---- Vérification nouveau message pour une demande ----
    async function _checkNewMsg(id) {
      try {
        const data = await apiGet(`/messages_chat/${id}`);
        const msgs = data.results;
        if (!msgs || msgs.length === 0) return false;
        const lastDate = messageStamp(msgs[msgs.length - 1]);
        const key = lastMsgKey(id);
        const seen = localStorage.getItem(key);
        if (seen === null) { localStorage.setItem(key, ""); return false; }
        return seen !== lastDate;
      } catch { return false; }
    }

    // ---- Chargement du tableau ----
    async function loadDemandes() {
      loadingTable.value = true;
      errorTable.value   = null;
      try {
        // Récupère le domaine depuis le profil déjà chargé
        const domaine = user.domaine.value;
        if (!domaine) return;

        const data = await apiGet(`/demandes_a_consulter/${domaine}`);
        const rows = (data.results ?? []).map((r) => ({
          ...r,
          _date_heure: `${r.date_avis || "N/A"} | ${r.heure_avis || "N/A"}`,
        }));
        allDemandes.value = rows;

        // Badges "Nouveau message" — vérification en parallèle
        const checks = await Promise.allSettled(
          rows.map((r) => _checkNewMsg(r.id_demande))
        );
        const map = {};
        rows.forEach((r, i) => {
          map[r.id_demande] =
            checks[i].status === "fulfilled" ? checks[i].value : false;
        });
        newMessageMap.value = map;
      } catch (e) {
        errorTable.value = e.message;
      } finally {
        loadingTable.value = false;
      }
    }

    // ---- Actions boutons ----

    /**
     * Clic CHAT : marque le dernier message comme vu, puis redirige.
     * Même logique que handleChatClick() du legacy.
     */
    async function handleChatClick(id) {
      try {
        const data = await apiGet(`/messages_chat/${id}`);
        markMessagesSeen(id, data.results);
      } catch { /* silencieux */ }
      setTimeout(() => { window.location.href = `chat.html?id_dmd=${id}`; }, 100);
    }

    function goToDetail(id) {
      window.location.href = `detail_consulter_demande.html?id_dmd=${id}`;
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await loadDemandes();
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      statCards:     STAT_CARDS,
      filteredRows,
      newMessageMap,
      loadingTable,
      errorTable,
      filters,
      filterFields:  FILTER_FIELDS,
      columns:       COLUMNS,
      handleChatClick,
      goToDetail,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="container-fluid flex-grow-1 container-p-y">
            <h4 class="font-weight-bold py-3 mb-0">Demandes</h4>
            <div class="text-muted small mt-0 mb-4 d-block breadcrumb">

            </div>
            <div class="row">
                <div class="">
                    <div class="row">
                        <StatCard v-for="card in statCards" :key="card.niveau" :title="card.title" :niveau="card.niveau" />
                    </div>
                </div>
            </div>

            <div class="row">

                <div style="height: 310px" id="tasks-inner"></div>

                <div class="col-xl-12">
                    <div class="card mb-4">

                        <div class="card-header with-elements pb-0">
                            <DemandeFilters :fields="filterFields" v-model="filters" />
                            <div class="card-header-elements ml-auto p-0">
                                <ul class="nav nav-tabs">
                                    <li class="nav-item" id="dmd-intro">
                                        <a class="nav-link active" href="javascript:">Introduites</a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="nav-tabs-top">
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="demande-intro">
                                    <div style="height: 330px" id="tab-table-1">
                                        <DemandesTable :rows="filteredRows" :columns="columns" :action-headers="2" :error="errorTable">
                                            <template #badge="{ row }">
                                                <span v-if="newMessageMap[row.id_demande]" style='background:#ea580c;color:#fff;padding:2px 8px;border-radius:8px;font-size:12px;margin-left:8px;'>Nouveau</span>
                                            </template>
                                            <template #actions="{ row }">
                                                <ActionCell btn-class="btn btn-glow-info btn-info" label="Détails" @click="goToDetail(row.id_demande)" />
                                                <ActionCell btn-class="btn btn-glow-info btn-info" label="CHAT" @click="handleChatClick(row.id_demande)" />
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
    </AppLayout>
  `,
});
