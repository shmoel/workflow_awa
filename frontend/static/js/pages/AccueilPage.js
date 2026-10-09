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

import AppSidebar     from "../components/layout/AppSidebar.js";
import AppNavbar      from "../components/layout/AppNavbar.js";
import AppFooter      from "../components/layout/AppFooter.js";
import StatCard       from "../components/demandes/StatCard.js";
import DemandesTable, { formatNumber } from "../components/demandes/DemandesTable.js";
import DemandeFilters from "../components/demandes/DemandeFilters.js";

// ---------------------------------------------------------------------------
// Colonnes du tableau (ordre identique au legacy)
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: "banque",            label: "Banque" },
  { key: "categorie_demande", label: "Entité" },
  { key: "type_demande",      label: "Type de demande" },
  { key: "nom_client",        label: "Contrepartie" },
  { key: "_date_heure",       label: "Date / Heure" },
  { key: "description",       label: "Niveau validation" },
];

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const FILTER_FIELDS = [
  { key: "banque",       placeholder: "Filtrer par Banque" },
  { key: "entite",       placeholder: "Filtrer par Entité" },
  { key: "type",         placeholder: "Filtrer par Type" },
  { key: "contrepartie", placeholder: "Filtrer par Contrepartie" },
  { key: "date",         placeholder: "Filtrer par Date" },
];

const EMPTY_FILTERS = { banque: "", entite: "", type: "", contrepartie: "", date: "" };

// ---------------------------------------------------------------------------
// Cartes de compteurs (ordre identique au legacy)
// ---------------------------------------------------------------------------
const STAT_CARDS = [
  { title: "Validation GGR Local",  niveau: 1 },
  { title: "Clôturées",             niveau: 6 },
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

  components: {
    AppSidebar,
    AppNavbar,
    AppFooter,
    StatCard,
    DemandesTable,
    DemandeFilters,
  },

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
          _date_heure: `${r.date_avis || ""} ${r.heure_avis || ""}`.trim(),
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
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <AppSidebar active-page="accueil" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Demandes" />

        <main class="flex-1 p-5 space-y-6" role="main" aria-label="Tableau de bord">

          <!-- ---- Grille des 6 compteurs ---- -->
          <section aria-label="Compteurs de demandes par niveau de validation">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                v-for="card in statCards"
                :key="card.niveau"
                :title="card.title"
                :niveau="card.niveau"
              />
            </div>
          </section>

          <!-- ---- Tableau des demandes introduites ---- -->
          <section
            class="bg-white rounded-2xl shadow-sm border overflow-hidden"
            style="border-color: var(--color-brand-border);"
            aria-label="Demandes introduites"
          >
            <!-- En-tête : filtres + onglet -->
            <div
              class="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-0 border-b"
              style="border-color: var(--color-brand-border);"
            >
              <div class="pb-3">
                <DemandeFilters :fields="filterFields" v-model="filters" />
              </div>
              <!-- Onglet unique "Introduites" (identique au legacy) -->
              <div class="pb-0">
                <ul class="flex list-none m-0 p-0" role="tablist">
                  <li role="presentation">
                    <button
                      role="tab"
                      aria-selected="true"
                      class="px-4 py-2 text-sm font-semibold border-b-2 focus:outline-none"
                      style="color: var(--color-brand); border-color: var(--color-brand); background: transparent;"
                    >
                      Introduites
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Tableau via DemandesTable v2 -->
            <DemandesTable
              :rows="filteredRows"
              :columns="columns"
              :loading="loadingTable"
              :error="errorTable"
              aria-label="Tableau des demandes introduites"
            >
              <!-- Slot badge : "Nouveau" dans la colonne Banque -->
              <template #badge="{ row }">
                <span
                  v-if="newMessageMap[row.id_demande]"
                  class="inline-block ml-2 px-2 py-0.5 text-xs font-bold text-white rounded-full"
                  style="background: var(--color-brand);"
                  aria-label="Nouveau message"
                >
                  Nouveau
                </span>
              </template>

              <!-- Slot actions : Détails + CHAT -->
              <template #actions="{ row }">
                <button
                  @click="goToDetail(row.id_demande)"
                  class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors"
                  style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                  onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                  onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                  :aria-label="'Détails de la demande ' + row.id_demande"
                >
                  Détails
                </button>
                <button
                  @click="handleChatClick(row.id_demande)"
                  class="text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors relative"
                  style="color: var(--color-brand); border-color: var(--color-brand); background: #fff;"
                  onmouseover="this.style.background='var(--color-brand)';this.style.color='#fff';"
                  onmouseout="this.style.background='#fff';this.style.color='var(--color-brand)';"
                  :aria-label="'Chat pour la demande ' + row.id_demande"
                >
                  CHAT
                  <span
                    v-if="newMessageMap[row.id_demande]"
                    class="inline-block w-2 h-2 rounded-full ml-1"
                    style="background: var(--color-brand); box-shadow: 0 0 0 2px #fff;"
                    aria-hidden="true"
                  ></span>
                </button>
              </template>
            </DemandesTable>

          </section>

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
          aria-labelledby="popup-title-accueil"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-title-accueil"
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
